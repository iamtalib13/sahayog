import frappe
from frappe.model.document import Document

class EODTeam(Document):
    def on_update(self):
        """Runs when the document is saved to assign or remove roles dynamically."""
        manager_role = "EOD Checklist Manager"
        member_role = "EOD Checklist Member"
        
        old_doc = self.get_doc_before_save()
        
        # --- 1. Handle Team Lead ---
        if frappe.db.exists("Role", manager_role):
            if old_doc and old_doc.team_lead and old_doc.team_lead != self.team_lead:
                self.remove_lead_role_if_not_needed(old_doc.team_lead, manager_role)
            
            if self.team_lead:
                user_doc = frappe.get_doc("User", self.team_lead)
                user_doc.add_roles(manager_role)

        # --- 2. Handle Team Members (Child Table) ---
        if frappe.db.exists("Role", member_role):
            # Extract lists of users from the old table and new table
            old_members = set(row.user for row in old_doc.team_members if row.user) if old_doc else set()
            current_members = set(row.user for row in self.team_members if row.user)

            # Find users who were removed from the table and revoke their role safely
            removed_members = old_members - current_members
            for user_email in removed_members:
                self.remove_member_role_if_not_needed(user_email, member_role)

            # Add the role to all current members in the table
            for user_email in current_members:
                user_doc = frappe.get_doc("User", user_email)
                user_doc.add_roles(member_role)

    def on_trash(self):
        """Runs when the document is deleted to safely clean up all roles."""
        if self.team_lead:
            self.remove_lead_role_if_not_needed(self.team_lead, "EOD Checklist Manager")
        
        for row in self.team_members:
            if row.user:
                self.remove_member_role_if_not_needed(row.user, "EOD Checklist Member")

    def remove_lead_role_if_not_needed(self, user_email, role):
        """Removes the Manager role only if the user is NOT a lead in another EOD Team."""
        is_still_lead = frappe.db.exists(
            "EOD Team", 
            {
                "team_lead": user_email, 
                "name": ("!=", self.name)
            }
        )
        if not is_still_lead:
            user_doc = frappe.get_doc("User", user_email)
            user_doc.remove_roles(role)

    def remove_member_role_if_not_needed(self, user_email, role):
        """Removes the Member role only if the user is NOT a member in another EOD Team."""
        # Query the child doctype ("Team Members") directly to see if they are in another team's list
        is_still_member = frappe.db.exists(
            "Team Members", 
            {
                "user": user_email, 
                "parent": ("!=", self.name),
                "parenttype": "EOD Team"
            }
        )
        if not is_still_member:
            user_doc = frappe.get_doc("User", user_email)
            user_doc.remove_roles(role)