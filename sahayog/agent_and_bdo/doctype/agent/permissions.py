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

    if employee:
        conditions = []

        if employee.sol_id:
            conditions.append(f"`tabAgent`.branch_code = '{employee.sol_id}'")

        if employee.employee_number:
            conditions.append(f"`tabAgent`.employee = '{employee.employee_number}'")

        if conditions:
            return " OR ".join(conditions)


    return "1=0"
