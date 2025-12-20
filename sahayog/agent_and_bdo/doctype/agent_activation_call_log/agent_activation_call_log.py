import frappe
from frappe.model.document import Document

class AgentActivationCallLog(Document):
    
    def before_insert(self):
        """Set trainer as the currently logged-in user automatically."""
        if not self.trainer:
            self.trainer = frappe.session.user

    def before_submit(self):
        """Validate that at least one status checkbox is selected before submit."""
        # Check if at least one checkbox is selected
        if not (self.wants_to_stay or self.want_to_exit or self.exited):
            frappe.throw(
                "Please select at least one option — Wants to Stay, Want to Exit, or Exited."
            )

        # Validate date_of_exit when exited is checked
        if self.exited and not self.date_of_exit:
            frappe.throw("Please select Date of Exit when 'Exited' is checked.")
    
    def before_save(self):
        """Ensure the correct behavior when wants_to_stay is checked and amount is validated."""
        
        # If 'wants_to_stay' is checked, validate the amount
        if self.wants_to_stay == 1:
            # if not self.amount:
            #     frappe.throw("Amount is required when 'Wants to Stay' is checked.")
            
            # Check if the amount is a valid number
            try:
                amt = float(self.amount)
            except ValueError:
                frappe.throw("Amount must be a valid number when 'Wants to Stay' is checked.")
            
            # Ensure the amount is a valid integer and greater than zero
            if not amt.is_integer():
                frappe.throw("Amount must be an integer value when 'Wants to Stay' is checked.")
            
            if amt <= 0:
                frappe.throw("Amount must be greater than zero when 'Wants to Stay' is checked.")
        
        # Validate that at least one checkbox is selected (wants_to_stay, want_to_exit, exited)
        if not (self.wants_to_stay or self.want_to_exit or self.exited):
            frappe.throw(
                "Please select at least one option — Wants to Stay, Want to Exit, or Exited."
            )
        
        # If 'exited' is checked, ensure 'wants_to_stay' and 'want_to_exit' are unchecked
        if self.exited:
            if self.wants_to_stay:
                self.wants_to_stay = 0
            if self.want_to_exit:
                self.want_to_exit = 0
            if not self.date_of_exit:
                frappe.throw("Please provide a Date of Exit when 'Exited' is selected.")
