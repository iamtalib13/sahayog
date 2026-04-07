import frappe
from frappe.model.document import Document

class EODTeam(Document):
    def on_update(self):
        """Runs when the document is saved. Checks if the team lead changed."""
        role = "EOD Checklist Manager"
        if not frappe.db.exists("Role", role):
            return

        old_doc = self.get_doc_before_save()

        # If there was a previous team lead and it's different from the new one
        if old_doc and old_doc.team_lead and old_doc.team_lead != self.team_lead:
            self.remove_role_if_not_needed(old_doc.team_lead, role)

        # Add the role to the newly selected team lead
        if self.team_lead:
            user = frappe.get_doc("User", self.team_lead)
            user.add_roles(role)

    def on_trash(self):
        """Runs when the document is deleted to safely clean up the role."""
        if self.team_lead:
            self.remove_role_if_not_needed(self.team_lead, "EOD Checklist Manager")

    def remove_role_if_not_needed(self, email, role):
        """Removes the role only if the user is NOT a lead in any OTHER team."""
        # Check if this user is a lead for any other EOD Team except the current one
        is_still_lead_elsewhere = frappe.db.exists(
            "EOD Team", 
            {
                "team_lead": email, 
                "name": ("!=", self.name)
            }
        )
        
        # Only remove the role if they don't lead any other teams
        if not is_still_lead_elsewhere:
            user = frappe.get_doc("User", email)
            user.remove_roles(role)