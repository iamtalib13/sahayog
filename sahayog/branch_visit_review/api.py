import frappe


@frappe.whitelist()
def get_branch_manager(sol_id):
    return frappe.get_list(
        "Employee",
        filters={"sol_id": sol_id, "designation": "BRANCH MANAGER"},
        fields=["name", "employee_name", "sol_id", "designation"],
        limit_page_length=0,
    )
