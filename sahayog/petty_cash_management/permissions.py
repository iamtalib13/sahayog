import frappe

def get_branch_permission_query(user):
    # 1. Allow System Managers & HO Users to see everything
    roles = frappe.get_roles(user)
    if "System Manager" in roles or "HO Petty Cash Manager" in roles:
        return "" 

    # 2. Find the logged-in User's Employee record
    # FIX: Fetch 'sahayog_branch' instead of 'branch'
    employee_details = frappe.db.get_value("Employee", 
        {"user_id": user, "status": "Active"}, 
        ["name", "sahayog_branch"], 
        as_dict=True
    )

    # 3. If no linked employee found, or employee has no branch, block everything
    if not employee_details or not employee_details.sahayog_branch:
        return "1=0" 

    # 4. Return the SQL condition using the SOL ID
    # This ensures the filter is: branch = '1108'
    return f"branch = '{employee_details.sahayog_branch}'"
