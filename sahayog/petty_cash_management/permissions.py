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



def get_user_allowed_branches(user=None):
    """
    Returns a list of Branch IDs that the user is allowed to access.
    Logic:
    1. Administrator / System Manager / HO Manager -> ALL Branches.
    2. Branch User -> Only their assigned 'sahayog_branch' in Employee Master.
    """
    if not user:
        user = frappe.session.user

    # 1. Allow All for Admins and HO Managers
    roles = frappe.get_roles(user)
    if "System Manager" in roles or "Administrator" in roles or "HO Petty Cash Manager" in roles:
        return None # None implies "No restriction" / "All"

    # 2. Restrict Branch Users
    employee = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "sahayog_branch")
    
    if employee:
        return [employee] # Return as a list
    
    return [] # No branch assigned -> No access