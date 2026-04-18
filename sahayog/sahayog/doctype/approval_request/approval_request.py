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
            "Approval Request", self.name, "status")
        # Lock validation bypass if called from our backend action
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


@frappe.whitelist()
def submit_for_approval(docname):
    doc = frappe.get_doc("Approval Request", docname)

    if doc.status not in ["Draft", "Rejected"]:
        frappe.throw("Only Draft or Rejected requests can be submitted.")
    if not doc.approvers:
        frappe.throw("Please add at least one approver.")

    frappe.flags.in_approval_action = True
    try:
        doc.status = "Pending Approval"
        doc.acted_by = None
        doc.approver_remark = None
        doc.save(ignore_permissions=True)

        for row in doc.approvers:
            ensure_docshare(doc, row.approver)
            frappe.new_doc("Notification Log").update({
                "subject": f"Pending Approval: {doc.title}",
                "for_user": row.approver,
                "document_type": doc.doctype,
                "document_name": doc.name
            }).insert(ignore_permissions=True)

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
    valid_approvers = [d.approver for d in doc.approvers if d.approver]

    if doc.status != "Pending Approval":
        frappe.throw(f"This request is already {doc.status}.")
    if user not in valid_approvers:
        frappe.throw(
            "You do not have permission to approve or reject this request.")

    frappe.flags.in_approval_action = True
    try:
        doc.status = action
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
