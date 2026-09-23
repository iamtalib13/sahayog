import frappe


@frappe.whitelist()
def get_branch_manager(sol_id):
    return frappe.get_list(
        "Employee",
        filters={"sol_id": sol_id, "designation": "BRANCH MANAGER"},
        fields=["name", "employee_name", "sol_id", "designation"],
        limit_page_length=0,
    )


@frappe.whitelist()
def get_template_items(template):
    return frappe.get_all(
        "Branch Visit Template Item",
        filters={"parent": template},
        fields=["category", "parameter_name", "response_type", "is_mandatory"],
        order_by="idx asc",
        limit_page_length=0,
    )


@frappe.whitelist()
def get_employee_list():
    return frappe.get_all(
        "Employee",
        fields=["name", "employee_name"],
        order_by="employee_name asc",
        limit_page_length=0,
    )
