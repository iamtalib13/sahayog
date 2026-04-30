import frappe
from frappe.model.document import Document

LOCKED_STATUSES = ("Pending Approval", "Approved")


class ApprovalRequest(Document):
    def autoname(self):
        from frappe.model.naming import make_autoname        
        self.name = make_autoname(f"APP-REQ.-.YYYY.-.#####")

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
            "write": 1,
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
    Returns: { "is_valid": True/False, "is_last": True/False, "can_delegate": True/False }
    """
    doc = frappe.get_doc("Approval Request", docname)
    valid_approvers = get_all_valid_approvers(doc)
    current_user = frappe.session.user
    is_valid = current_user in valid_approvers
    
    is_last = False
    can_delegate = False
    can_bypass = False
    
    if is_valid:
        active_rows = [d for d in doc.approvers if not d.is_bypassed]
        
        if not active_rows:
            is_last = True
            can_delegate = (current_user == "Administrator")
            can_bypass = (current_user == "Administrator")
        else:
            # Check if user is a direct participant in ANY active row to allow bypass/delegate
            for row in active_rows:
                is_direct = (row.selection_type == "User" and (row.approver == current_user or row.delegated_to == current_user))
                is_group_member = False
                if row.selection_type == "Group":
                    if row.delegated_to == current_user:
                        is_group_member = True
                    else:
                        user_emp = frappe.db.get_value("Employee", {"user_id": current_user}, "name")
                        if user_emp and frappe.db.exists("Employee Group Table", {"parent": row.group_email, "employee": user_emp}):
                            is_group_member = True
                
                if is_direct or current_user == "Administrator":
                    can_delegate = True
                    can_bypass = True
                
                if is_group_member:
                    can_bypass = True
                
                if can_delegate or can_bypass:
                    break

            # Bypass logic: Check if current user is in the LAST active row
            last_row = active_rows[-1]
            user_in_last_row = False
            if last_row.selection_type == "User" and (last_row.approver == current_user or last_row.delegated_to == current_user):
                user_in_last_row = True
            elif last_row.selection_type == "Group":
                if last_row.delegated_to == current_user:
                    user_in_last_row = True
                else:
                    user_emp = frappe.db.get_value("Employee", {"user_id": current_user}, "name")
                    if user_emp and frappe.db.exists("Employee Group Table", {"parent": last_row.group_email, "employee": user_emp}):
                        user_in_last_row = True
            
            # Also check if user is the manager of the last row's approver (Managers are considered "in the last row" for bypass restriction)
            if not user_in_last_row and last_row.selection_type == "User":
                emp = frappe.db.get_value("Employee", {"user_id": last_row.approver}, "reports_to")
                if emp:
                    mgr = frappe.db.get_value("Employee", emp, "user_id")
                    if mgr == current_user: user_in_last_row = True
                if not user_in_last_row and last_row.delegated_to:
                    d_emp = frappe.db.get_value("Employee", {"user_id": last_row.delegated_to}, "reports_to")
                    if d_emp:
                        d_mgr = frappe.db.get_value("Employee", d_emp, "user_id")
                        if d_mgr == current_user: user_in_last_row = True

            if user_in_last_row:
                is_last = True

    return {"is_valid": is_valid, "is_last": is_last, "can_delegate": can_delegate, "can_bypass": can_bypass}


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
        
        is_direct = (d.selection_type == "User" and (d.approver == current_user or d.delegated_to == current_user))
        
        if is_direct:
            target_row = d
            break
    
    if not target_row and current_user != "Administrator":
        frappe.throw("You are not authorized to delegate this request. Note: Group members cannot delegate.")
    
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
        
        is_direct = (d.selection_type == "User" and (d.approver == current_user or d.delegated_to == current_user))
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
                        "recipient_name": d.approver_name if d.selection_type == "User" else "Team",
                        "is_group": d.selection_type == "Group",
                        "url": f"http://mysahayog.com/app/approval-request/{doc.name}"
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
    Hybrid Approach: Pre-calculate allowed document names to ensure List View 
    matches complex Python permission logic (Managers/Delegates/Groups).
    """
    if not user:
        user = frappe.session.user

    if "System Manager" in frappe.get_roles(user):
        return ""

    # 1. Fetch all requests that are not Draft, or owned by the user
    # We filter by 'Draft' and 'Owner' first to reduce the loop size
    potential_docs = frappe.get_all("Approval Request", 
        filters=[
            ["docstatus", "<", 2], # Not cancelled
        ],
        fields=["name", "owner", "approval_status"]
    )

    allowed_names = []

    for d in potential_docs:
        # Owner always sees their own record
        if d.owner == user:
            allowed_names.append(d.name)
            continue
        
        # Others only see if it's NOT a Draft
        if d.approval_status != "Draft":
            # Reuse the heavy logic from the controller
            doc_obj = frappe.get_doc("Approval Request", d.name)
            valid_approvers = get_all_valid_approvers(doc_obj)
            
            if user in valid_approvers:
                allowed_names.append(d.name)

    if not allowed_names:
        return "1=0"

    # Convert list to SQL safe string
    names_sql = ", ".join([frappe.db.escape(name) for name in allowed_names])
    return f"`tabApproval Request`.name IN ({names_sql})"


def has_permission(doc, ptype="read", user=None):
    """
    Form view permission sync with list view.
    """
    if not user:
        user = frappe.session.user

    if "System Manager" in frappe.get_roles(user):
        return True

    # Owner can always read
    if doc.owner == user:
        return True

    # Approvers can read only if not Draft
    if doc.approval_status != "Draft":
        valid_approvers = get_all_valid_approvers(doc)
        if user in valid_approvers:
            if ptype in ["read", "share"]:
                return True
            if ptype == "write":
                return doc.approval_status == "Pending Approval"

    return False
