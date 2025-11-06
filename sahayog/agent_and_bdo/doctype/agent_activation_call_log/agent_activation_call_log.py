import frappe
from frappe.model.document import Document

class AgentActivationCallLog(Document):
    def before_insert(self):
        """Set trainer as the currently logged-in user automatically."""
        # Store frappe session user (current logged-in user)
        if not self.trainer:
            self.trainer = frappe.session.user