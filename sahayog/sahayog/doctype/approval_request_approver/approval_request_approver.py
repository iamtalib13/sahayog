import frappe
from frappe.model.document import Document
from frappe.utils import now


class ApprovalRequestApprover(Document):
    def before_save(self):
        # If approver changes status → set decision time
        if self.status in ["Approved", "Rejected"] and not self.decision_time:
            self.decision_time = now()

    def after_save(self):
        # Update parent status whenever approver updates
        parent = frappe.get_doc("Approval Request", self.parent)
        parent.update_status()
