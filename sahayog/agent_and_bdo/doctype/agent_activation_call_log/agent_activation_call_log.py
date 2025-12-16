# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class AgentActivationCallLog(Document):
    def before_insert(self):
        """Set trainer as the currently logged-in user automatically."""
        if not self.trainer:
            self.trainer = frappe.session.user

    def before_submit(self):
        """Validate that at least one status checkbox is selected before submit."""
        # Check if all three are unchecked (0 or None)
        if not (self.wants_to_stay or self.want_to_exit or self.exited):
            frappe.throw(
                "Please select at least one option — Wants to Stay, Want to Exit, or Exited."
            )


def before_submit(self):
    """Validate that at least one status checkbox is selected before submit."""
    if not (self.wants_to_stay or self.want_to_exit or self.exited):
        frappe.throw(
            "Please select at least one option — Wants to Stay, Want to Exit, or Exited."
        )
    
    # Validate date_of_exit when exited is checked
    if self.exited and not self.date_of_exit:
        frappe.throw("Please select Date of Exit when 'Exited' is checked.")
