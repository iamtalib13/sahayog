import frappe

def employee_active_inactive_override(self, enabled):
    # Check if the user's status is not "Active"
    if not self.status == "Active":
        return

    # If enabled is None, throw an error that the user does not exist
    if enabled is None:
        frappe.throw("User {0} does not exist").format(self.user_id)

    # If enabled is 0, simply pass and do nothing
    if enabled == 0:
        return
