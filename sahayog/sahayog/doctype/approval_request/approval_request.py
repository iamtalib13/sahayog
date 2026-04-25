import frappe
from frappe.model.document import Document

LOCKED_STATUSES = ("Pending Approval", "Approved")


class ApprovalRequest(Document):
    def before_validate(self):
        if not (self.employee and self.employee_name and self.designation):
            emp = frappe.db.get_value(
                "Employee",
                {"user_id": frappe.session.user},
                ["name", "employee_name", "designation"],
                as_dict=True
            )
            if not emp:
                frappe.throw(
                    f"No Employee record found linked to your user account ({frappe.session.user}).")

            self.employee = emp.name
            self.employee_name = emp.employee_name
            self.designation = emp.designation

    def validate(self):
        if self.is_new():
            return

        old_status = frappe.db.get_value(
            "Approval Request", self.name, "approval_status")
        if old_status in LOCKED_STATUSES and not getattr(frappe.flags, "in_approval_action", False):
            frappe.throw(
                f"Document is locked in status '{old_status}' and cannot be edited.")


def ensure_docshare(doc, user):
    if not user:
        return
    if not frappe.db.exists("DocShare", {"share_doctype": doc.doctype, "share_name": doc.name, "user": user}):
        share = frappe.new_doc("DocShare")
        share.update({
            "share_doctype": doc.doctype,
            "share_name": doc.name,
            "user": user,
            "read": 1,
            "write": 0,
            "submit": 0,
            "share": 0
        })
        share.insert(ignore_permissions=True)


def get_all_valid_approvers(doc):
    """Returns a list of user_ids for direct approvers, group members, AND their reporting managers"""
    users = []
    for d in doc.approvers:
        if d.is_bypassed:
            continue

        if d.selection_type == "User" and d.approver:
            users.append(d.approver)
            
            # Add original manager
            emp = frappe.db.get_value("Employee", {"user_id": d.approver}, "reports_to")
            if emp:
                manager_user = frappe.db.get_value("Employee", emp, "user_id")
                if manager_user: users.append(manager_user)

            if d.delegated_to:
                users.append(d.delegated_to)
                # Add delegate's manager
                d_emp = frappe.db.get_value("Employee", {"user_id": d.delegated_to}, "reports_to")
                if d_emp:
                    d_manager_user = frappe.db.get_value("Employee", d_emp, "user_id")
                    if d_manager_user: users.append(d_manager_user)
        
        elif d.selection_type == "Group" and d.group_email:
            # Fetch all employees from the Employee Group
            group_members = frappe.get_all("Employee Group Table", 
                filters={"parent": d.group_email}, 
                fields=["employee"])
            
            for member in group_members:
                user_id = frappe.db.get_value("Employee", member.employee, "user_id")
                if user_id:
                    users.append(user_id)
            
            if d.delegated_to:
                users.append(d.delegated_to)

    return list(set(users))  # Remove duplicates


@frappe.whitelist()
def is_valid_approver(docname):
    """Called by JS to see if current user is an approver or manager.
    Returns: { "is_valid": True/False, "is_last": True/False }
    """
    doc = frappe.get_doc("Approval Request", docname)
    valid_approvers = get_all_valid_approvers(doc)
    is_valid = frappe.session.user in valid_approvers
    
    # Check if this user is ONLY in the last active (non-bypassed) row
    is_last = False
    if is_valid:
        active_rows = [d for d in doc.approvers if not d.is_bypassed]
        if active_rows:
            last_row = active_rows[-1]
            # If current user is in last_row but NOT in any previous active rows
            user_in_last = False
            if last_row.selection_type == "User" and (last_row.approver == frappe.session.user or last_row.delegated_to == frappe.session.user):
                user_in_last = True
            elif last_row.selection_type == "Group":
                user_emp = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
                if user_emp and frappe.db.exists("Employee Group Table", {"parent": last_row.group_email, "employee": user_emp}):
                    user_in_last = True
                if last_row.delegated_to == frappe.session.user:
                    user_in_last = True
            
            if user_in_last:
                # Check previous rows
                user_in_previous = False
                for prev_row in active_rows[:-1]:
                    if prev_row.selection_type == "User" and (prev_row.approver == frappe.session.user or prev_row.delegated_to == frappe.session.user):
                        user_in_previous = True; break
                    elif prev_row.selection_type == "Group":
                        user_emp = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
                        if (user_emp and frappe.db.exists("Employee Group Table", {"parent": prev_row.group_email, "employee": user_emp})) or prev_row.delegated_to == frappe.session.user:
                            user_in_previous = True; break
                
                if not user_in_previous:
                    is_last = True

    return {"is_valid": is_valid, "is_last": is_last}


@frappe.whitelist()
def delegate_approval(docname, delegate_user, remark):
    doc = frappe.get_doc("Approval Request", docname)
    current_user = frappe.session.user

    if doc.approval_status != "Pending Approval":
        frappe.throw(f"Request must be in 'Pending Approval' status to delegate.")

    # Find which row the current user is associated with
    target_row = None
    for d in doc.approvers:
        if d.is_bypassed: continue
        
        is_direct = (d.selection_type == "User" and d.approver == current_user)
        is_group_member = False
        if d.selection_type == "Group" and d.group_email:
            user_emp = frappe.db.get_value("Employee", {"user_id": current_user}, "name")
            if user_emp and frappe.db.exists("Employee Group Table", {"parent": d.group_email, "employee": user_emp}):
                is_group_member = True
        
        if is_direct or is_group_member:
            target_row = d
            break
    
    if not target_row and current_user != "Administrator":
        frappe.throw("You are not authorized to delegate this request.")
    
    if current_user == "Administrator" and not target_row:
        # Admin can delegate any active row
        for d in doc.approvers:
            if not d.is_bypassed:
                target_row = d
                break

    if not target_row:
        frappe.throw("No active approver row found to delegate.")

    frappe.flags.in_approval_action = True
    try:
        target_row.delegated_to = delegate_user
        doc.add_comment("Comment", f"Approval delegated to {delegate_user} by {current_user}. Remark: {remark}")
        doc.save(ignore_permissions=True)
    finally:
        frappe.flags.in_approval_action = False
    
    # Notify delegate
    ensure_docshare(doc, delegate_user)
    frappe.new_doc("Notification Log").update({
        "subject": f"Approval Delegated to you: {doc.title}",
        "for_user": delegate_user,
        "document_type": doc.doctype,
        "document_name": doc.name
    }).insert(ignore_permissions=True)

    return "Success"


@frappe.whitelist()
def bypass_approval(docname, remark):
    doc = frappe.get_doc("Approval Request", docname)
    current_user = frappe.session.user

    if doc.approval_status != "Pending Approval":
        frappe.throw(f"Request must be in 'Pending Approval' status to bypass.")

    # Find active rows to bypass
    bypassed_any = False
    for d in doc.approvers:
        if d.is_bypassed: continue
        
        is_direct = (d.selection_type == "User" and d.approver == current_user)
        is_group_member = False
        if d.selection_type == "Group" and d.group_email:
            user_emp = frappe.db.get_value("Employee", {"user_id": current_user}, "name")
            if user_emp and frappe.db.exists("Employee Group Table", {"parent": d.group_email, "employee": user_emp}):
                is_group_member = True
        
        if is_direct or is_group_member or current_user == "Administrator":
            d.is_bypassed = 1
            bypassed_any = True
            # In bypass, we don't break because one user might bypass their multiple roles/groups
    
    if not bypassed_any:
        frappe.throw("You are not authorized to bypass this request.")

    frappe.flags.in_approval_action = True
    try:
        doc.add_comment("Comment", f"Approval level bypassed by {current_user}. Remark: {remark}")
        doc.save(ignore_permissions=True)
    finally:
        frappe.flags.in_approval_action = False

    return "Success"


@frappe.whitelist()
def submit_for_approval(docname):
    doc = frappe.get_doc("Approval Request", docname)

    if doc.approval_status not in ["Draft", "Rejected"]:
        frappe.throw("Only Draft or Rejected requests can be submitted.")
    if not doc.approvers:
        frappe.throw("Please add at least one approver or group.")
    
    # Check if at least one row has a selection
    has_valid_selection = False
    for d in doc.approvers:
        if (d.selection_type == "User" and d.approver) or (d.selection_type == "Group" and d.group_email):
            has_valid_selection = True
            break
    
    if not has_valid_selection:
        frappe.throw("Please select at least one Approver or Employee Group.")

    frappe.flags.in_approval_action = True
    try:
        doc.approval_status = "Pending Approval"
        doc.acted_by = None
        doc.approver_remark = None
        doc.save(ignore_permissions=True)

        approvers_to_notify = get_all_valid_approvers(doc)

        for user in approvers_to_notify:
            ensure_docshare(doc, user)
            frappe.new_doc("Notification Log").update({
                "subject": f"Pending Approval: {doc.title}",
                "for_user": user,
                "document_type": doc.doctype,
                "document_name": doc.name
            }).insert(ignore_permissions=True)

        # --- NEW: SEND EMAIL TO APPROVERS (GROUPS AND INDIVIDUAL USERS) ---
        notified_emails = [] # To avoid duplicate emails if someone is both in group and direct

        for d in doc.approvers:
            recipient_email = None
            if d.selection_type == "Group" and d.group_email:
                recipient_email = frappe.db.get_value("Employee Group", d.group_email, "group_email")
            
            elif d.selection_type == "User" and d.approver:
                # Fetch email from Employee's company_email field strictly
                emp_details = frappe.db.get_value("Employee", {"user_id": d.approver}, ["employee_name", "company_email"], as_dict=True)
                
                if not emp_details or not emp_details.company_email:
                    frappe.throw(f"Approver {d.approver} ({emp_details.employee_name if emp_details else 'Unknown'}) does not have a Company Email. Please update their Employee record.")
                
                recipient_email = emp_details.company_email

            if recipient_email and recipient_email not in notified_emails:
                # Fetch template from database
                try:
                    et = frappe.get_doc("Email Template", "new_group_approval_request")
                    
                    # Support both response and response_html fields
                    content = et.response_html if (et.get("use_html") and et.get("response_html")) else et.response
                    
                    args = {
                        "doc": doc,
                        "requester": doc.employee_name or doc.owner,
                        "url": frappe.utils.get_url_to_form(doc.doctype, doc.name)
                    }
                    
                    message = frappe.render_template(content, args)
                    subject = frappe.render_template(et.subject, args)

                    frappe.sendmail(
                        recipients=[recipient_email],
                        subject=subject or f"Approval Request: {doc.title}",
                        message=message,
                        delayed=False
                    )
                    notified_emails.append(recipient_email)
                except frappe.DoesNotExistError:
                    # Fallback if template not found
                    frappe.sendmail(
                        recipients=[recipient_email],
                        subject=f"Approval Request: {doc.title}",
                        message=f"A new approval request '{doc.title}' has been submitted by {doc.employee_name or doc.owner}. Please login to Sahayog Portal.",
                        delayed=False
                    )
                    notified_emails.append(recipient_email)

        doc.add_comment(
            "Comment", f"Request submitted for approval by {frappe.session.user}")
    finally:
        frappe.flags.in_approval_action = False

    return "Success"


@frappe.whitelist()
def process_approval(docname, action, remark):
    if action not in ["Approved", "Rejected"]:
        frappe.throw("Invalid action.")

    doc = frappe.get_doc("Approval Request", docname)
    user = frappe.session.user

    valid_approvers = get_all_valid_approvers(doc)

    if doc.approval_status != "Pending Approval":
        frappe.throw(f"This request is already {doc.approval_status}.")
    if user not in valid_approvers:
        frappe.throw(
            "You do not have permission to approve or reject this request.")

    frappe.flags.in_approval_action = True
    try:
        doc.approval_status = action
        doc.acted_by = user
        doc.approver_remark = remark
        doc.save(ignore_permissions=True)

        doc.add_comment(
            "Comment", f"Request {action} by {user}. Remark: {remark}")

        frappe.new_doc("Notification Log").update({
            "subject": f"Your request was {action} by {user}",
            "for_user": doc.owner,
            "document_type": doc.doctype,
            "document_name": doc.name
        }).insert(ignore_permissions=True)
    finally:
        frappe.flags.in_approval_action = False

    return "Success"


# --- PERMISSION HOOKS ---

def get_permission_query_conditions(user):
    """
    Filters the List View so users only see allowed documents.
    """
    if not user:
        user = frappe.session.user

    # System Managers see everything
    if "System Manager" in frappe.get_roles(user):
        return ""

    emp_name = frappe.db.get_value("Employee", {"user_id": user}, "name")
    subordinates = []
    if emp_name:
        subs = frappe.get_all("Employee", filters={
                              "reports_to": emp_name}, fields=["user_id"])
        subordinates = [s.user_id for s in subs if s.user_id]

    allowed_users = [user] + subordinates
    escaped_users = ", ".join([frappe.db.escape(u) for u in allowed_users])
    escaped_user = frappe.db.escape(user)
    
    # Get Employee Groups this user belongs to
    user_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    group_filters = ["''"] # Start with empty to avoid SQL error
    if user_employee:
        groups = frappe.get_all("Employee Group Table", filters={"employee": user_employee}, fields=["parent"])
        for g in groups:
            group_filters.append(frappe.db.escape(g.parent))
    
    group_condition = ", ".join(group_filters)

    # Creator sees their own docs. Approvers/Managers/Group Members see docs ONLY if not Draft.
    return f"""(
        `tabApproval Request`.owner = {escaped_user}
        OR (
            `tabApproval Request`.approval_status != 'Draft'
            AND `tabApproval Request`.name IN (
                SELECT parent FROM `tabApproval Approver` 
                WHERE parenttype='Approval Request' 
                AND (approver IN ({escaped_users}) OR group_email IN ({group_condition}))
            )
        )
    )"""


def has_permission(doc, ptype="read", user=None):
    """
    Runs when a user tries to open a specific document.
    """
    if not user:
        user = frappe.session.user

    if "System Manager" in frappe.get_roles(user):
        return True

    # Creator can view/edit their own document
    if doc.owner == user:
        return True

    # If it's a Draft, ONLY the creator can see it (enforced because it skips the next block)
    if doc.approval_status != "Draft" and doc.get("approvers"):
        valid_approvers = get_all_valid_approvers(doc)
        if user in valid_approvers:
            # Approvers can read, but they should not be able to 'write' (save) the core document
            if ptype == "read":
                return True
            if ptype == "write":
                # Only let them write if it is Pending Approval (so they can approve/reject)
                return doc.approval_status == "Pending Approval"

    return False
