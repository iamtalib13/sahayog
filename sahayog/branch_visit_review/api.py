import frappe


@frappe.whitelist()
def get_branch_manager(sol_id):
    return frappe.get_list(
        "Employee",
        filters={"sol_id": sol_id, "designation": "BRANCH MANAGER"},
        fields=["name", "employee_name", "sol_id", "designation", "user_id"],
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


def can_sign_visitor(visited_by=None, user=None):
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    if not visited_by:
        return False
    if frappe.db.get_value("Employee", visited_by, "user_id") == user:
        return True
    return frappe.db.get_value("Employee", {"user_id": user}, "name") == visited_by


@frappe.whitelist()
def can_visitor_sign_off(visited_by=None):
    return can_sign_visitor(visited_by)


def can_sign_branch_head(branch=None, user=None):
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    if not branch:
        return False
    sol_id = frappe.db.get_value("Sahayog Branch", branch, "sol_id")
    if not sol_id:
        return False
    managers = get_branch_manager(sol_id) or []
    return any(manager.get("user_id") == user for manager in managers)


@frappe.whitelist()
def can_branch_head_sign_off(branch=None):
    return can_sign_branch_head(branch)
