import frappe
from frappe import _
from frappe.model.document import Document


class EmployeeCreationRequest(Document):
    def before_insert(self):
        self.requested_by = frappe.session.user
        self.status = "Pending Approval"
        self.approved_by = None
        self.action_remark = None
        self.created_employee = None

    def validate(self):
        if self.is_new() or getattr(frappe.flags, "in_ecr_action", False):
            return

        old_status = frappe.db.get_value(self.doctype, self.name, "status")
        if old_status and old_status != "Pending Approval":
            frappe.throw(
                _("This request is already {0} and cannot be edited.").format(old_status)
            )
        if self.status != "Pending Approval":
            frappe.throw(_("Status can only be changed by HR approval."))
