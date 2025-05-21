import frappe

@frappe.whitelist()
def get_logged_in_employee():
    if frappe.session.user == "Administrator":
        return {"error": "Administrator login not allowed"}

    employee = frappe.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        [
            "employee_name",
            "employee",  # employee code
            "reports_to",
            "designation",
            "branch",
            "custom_zone",
            "custom_region",
            "custom_division",
            "date_of_joining",
            "cell_number",  # added
            "gender"        # added
        ],
        as_dict=True
    )

    if not employee:
        return {}

    # If reports_to is set (it should be an employee ID), fetch its employee_name
    if employee.get("reports_to"):
        reports_to_name = frappe.get_value(
            "Employee",
            employee["reports_to"],
            "employee_name"
        )
        employee["reports_to"] = reports_to_name or employee["reports_to"]

    return employee


@frappe.whitelist()
def get_user_tickets():
    tickets = frappe.get_all(
        "Sahayog Ticket",
        filters={"owner": frappe.session.user},
        fields=["name", "status", "priority", "creation","branch_name","employee_name","region","call_log_date","ticket_type","description"],
        order_by="creation desc"
    )
    return tickets