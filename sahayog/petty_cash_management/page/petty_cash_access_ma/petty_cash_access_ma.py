import frappe

@frappe.whitelist()
def get_eligible_employees():
    """Fetch employees matching the specific designations who have a linked User ID."""
    employees = frappe.get_all(
        "Employee",
        filters={
            "designation": ["in", ["Branch Operation Manager", "Branch Manager"]],
            "user_id": ["is", "set"] # Ensure they have a linked user account
        },
        fields=["name", "employee_name", "designation", "user_id"],
        order_by="employee_name asc"
    )
    return employees





@frappe.whitelist()
def get_employee_role_status(user_id):
    """Check if the linked user already has the Branch User role."""
    if not user_id:
        return False
    has_role = frappe.db.exists("Has Role", {"parent": user_id, "role": "Branch User"})
    return bool(has_role)

# @frappe.whitelist()
# def toggle_branch_user_role(user_id, enable):
#     """Instantly add or remove the Branch User role for the given User ID."""
#     if not user_id:
#         frappe.throw("No User ID linked to this employee.")
        
#     enable = frappe.parse_json(enable)
#     user = frappe.get_doc("User", user_id)
    
#     # Frappe's built-in methods for User doctype handle the Has Role child table mapping
#     if enable:
#         user.add_roles("Branch User")
#         return {"status": "added"}
#     else:
#         user.remove_roles("Branch User")
#         return {"status": "removed"}
    


@frappe.whitelist()
def toggle_branch_user_role(user_id, enable):
    """Instantly add or remove the Branch User role for the given User ID."""
    if not user_id:
        frappe.throw("No User ID linked to this employee.")
        
    enable = frappe.parse_json(enable)
    user = frappe.get_doc("User", user_id)
    
    if enable:
        user.add_roles("Branch User")
        status = "added"
    else:
        user.remove_roles("Branch User")
        status = "removed"

    # Clear any system messages (like "User Permission Cleared") to prevent frontend modals
    if hasattr(frappe.local, 'message_log'):
        frappe.local.message_log = []

    return {"status": status}