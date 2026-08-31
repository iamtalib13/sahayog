import frappe

def get_agents_sol_wise(user=None):
    if not user:
        user = frappe.session.user

    user_roles = frappe.get_roles(user)

    # ✅ Step 1: Admins (Administrator / MIS Admin) can see all records
    if (
        "Administrator" in user_roles 
        or "MIS Admin" in user_roles
        or "Trainer" in user_roles  
    ):
        return ""

    conditions = []

    # ✅ Step 2: Get additional sol_ids from Report Preference dynamically
    from sahayog.permissions import get_user_sol_ids
    additional_sol_ids = get_user_sol_ids(user)

    if additional_sol_ids:
        formatted_sols = ", ".join(f"'{sol}'" for sol in additional_sol_ids)
        conditions.append(f"`tabAgent`.branch_code IN ({formatted_sols})")

    # ✅ Step 3: Get employee info linked with the user
    employee = frappe.db.get_value(
        "Employee",
        {"user_id": user},
        ["sol_id", "employee_number", "designation"],
        as_dict=True,
    )

    if employee and employee.sol_id:
        # ✅ Step 4: Define designations that can see entire branch data
        full_branch_access_designations = [
            "BRANCH MANAGER",
            "Asst. Branch Manager",
            "Branch Operation Manager"
        ]

        # ✅ Step 5: If user’s designation is in full access list
        if employee.designation in full_branch_access_designations:
            branch_condition = f"`tabAgent`.branch_code = '{employee.sol_id}'"
            conditions.append(f"({branch_condition})")

        else:
            # ✅ Step 6: Normal employee logic
            # Unallocated records of the same branch
            branch_unallocated = (
                f"`tabAgent`.branch_code = '{employee.sol_id}' "
                f"AND IFNULL(`tabAgent`.status, '') IN ('', 'Unallocated')"
            )
            conditions.append(f"({branch_unallocated})")

            # Allocated records specifically assigned to the employee
            if employee.employee_number:
                employee_allocated = (
                    f"`tabAgent`.branch_code = '{employee.sol_id}' "
                    f"AND `tabAgent`.employee = '{employee.employee_number}' "
                    f"AND `tabAgent`.status = 'Allocated'"
                )
                conditions.append(f"({employee_allocated})")

    # ✅ Step 7: Records where user is approver or requester
    user_approver = f"`tabAgent`.approved_by = '{user}'"
    user_requester = f"`tabAgent`.requested_by = '{user}'"
    conditions.append(f"({user_approver})")
    conditions.append(f"({user_requester})")

    # ✅ Step 8: Return final OR-based condition
    return " OR ".join(conditions) if conditions else "1=0"
