import frappe

def get_agents_sol_wise(user=None):
    if not user:
        user = frappe.session.user

    user_roles = frappe.get_roles(user)

    # Check if user is Administrator or MIS Admin
    if "Administrator" in user_roles or "MIS Admin" in user_roles:
        return ""

    employee = frappe.db.get_value(
        "Employee",
        {"user_id": user},
        ["sol_id", "employee_number"],
        as_dict=True,
    )

    if not employee or not employee.sol_id:
        return "1=0"

    conditions = []
    
    # Always include branch-wise unallocated data
    branch_unallocated = f"`tabAgent`.branch_code = '{employee.sol_id}' AND IFNULL(`tabAgent`.status, '') IN ('', 'Unallocated')"
    conditions.append(f"({branch_unallocated})")
    
    # If employee number exists, add allocated records for this specific employee
    if employee.employee_number:
        employee_allocated = f"`tabAgent`.branch_code = '{employee.sol_id}' AND `tabAgent`.employee = '{employee.employee_number}' AND `tabAgent`.status = 'Allocated'"
        conditions.append(f"({employee_allocated})")
    
    # Show records where current user is the approver (approved_by field)
    user_approver = f"`tabAgent`.approved_by = '{user}'"
    conditions.append(f"({user_approver})")
    
    # Show records where current user is the requester (requested_by field)
    user_requester = f"`tabAgent`.requested_by = '{user}'"
    conditions.append(f"({user_requester})")

    return " OR ".join(conditions) if conditions else "1=0"
