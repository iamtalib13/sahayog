import frappe

def validate_access():
    """Ensure the user has one of the required roles to use this module."""
    if frappe.session.user == "Administrator":
        return True
        
    allowed_roles = ["HO Petty Cash Manager", "HO Petty Cash Verifier"]
    user_roles = frappe.get_roles(frappe.session.user)
    
    if not any(role in user_roles for role in allowed_roles):
        frappe.throw("You do not have permission to access Petty Cash Management configurations.", frappe.PermissionError)

@frappe.whitelist()
def get_eligible_employees():
    validate_access()
    
    employees = frappe.get_all(
        "Employee",
        filters={
            "designation": ["in", ["Branch Operation Manager", "Branch Manager"]],
            "user_id": ["is", "set"]
        },
        fields=["name", "employee_name", "designation", "user_id", "sahayog_branch"],
        order_by="employee_name asc"
    )
    
    for emp in employees:
        if emp.sahayog_branch:
            branch_name = frappe.db.get_value("Sahayog Branch", emp.sahayog_branch, "branch")
            emp.branch_name = branch_name or "Unknown"
        else:
            emp.branch_name = "N/A"
            
    return employees

@frappe.whitelist()
def get_employee_role_status(user_id):
    validate_access()
    
    if not user_id:
        return False
    has_role = frappe.db.exists("Has Role", {"parent": user_id, "role": "Branch User"})
    return bool(has_role)

@frappe.whitelist()
def toggle_branch_user_role(user_id, enable):
    validate_access()
    
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

    # Clear any system messages to prevent frontend modals
    if hasattr(frappe.local, 'message_log'):
        frappe.local.message_log = []

    return {"status": status}
    