import frappe
from frappe.model.document import Document
from frappe.utils import now

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
                frappe.throw(f"No Employee record found linked to your user account ({frappe.session.user}).")
            self.employee = emp.name
            self.employee_name = emp.employee_name
            self.designation = emp.designation

    def before_submit(self):
        self.status = "Pending Approval"

    def on_submit(self):
        for a in self.approvers:
            frappe.share.add(
                doctype=self.doctype,
                name=self.name,
                user=a.approver,
                read=1,
                write=0,
                submit=0,
                share=0,
                flags={"ignore_share_permission": True}
            )
            frappe.new_doc("Notification Log").update({
                "subject": f"Pending Approval: {self.title}",
                "for_user": a.approver,
                "document_type": self.doctype,
                "document_name": self.name
            }).insert(ignore_permissions=True)

    def on_cancel(self):
        self.status = "Rejected"


@frappe.whitelist()
def process_approval(docname, action, remark):
    doc = frappe.get_doc("Approval Request", docname)
    user = frappe.session.user

    if doc.status != "Pending Approval":
        frappe.throw(f"This request has already been {doc.status}.")

    valid_approvers = [a.approver for a in doc.approvers]
    if user not in valid_approvers:
        frappe.throw("You do not have permission to approve or reject this request.")

    frappe.flags.ignore_permissions = True

    try:
        doc.db_set("status", action)
        doc.db_set("approver_remark", remark)
        doc.db_set("acted_by", user)

        doc.add_comment("Comment", f"Request **{action}** by {user}.<br><b>Remark:</b> {remark}")

        if action == "Rejected":
            doc.cancel()

        frappe.new_doc("Notification Log").update({
            "subject": f"Your request was {action} by {user}",
            "for_user": doc.owner,
            "document_type": doc.doctype,
            "document_name": doc.name
        }).insert(ignore_permissions=True)

    finally:
        frappe.flags.ignore_permissions = False

    return "Success"