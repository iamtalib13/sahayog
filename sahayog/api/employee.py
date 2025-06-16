import frappe
@frappe.whitelist()
def get_logged_in_employee():
    if frappe.session.user == "Administrator":
        return {
            "employee_name": "ADMIN",
            "employee": "ADMIN",
            "reports_to": "ADMIN",
            "designation": "ADMIN",
            "branch": "ADMIN",
            "custom_zone": "ADMIN",
            "custom_region": "ADMIN",
            "custom_division": "ADMIN",
            "date_of_joining": "ADMIN",
            "cell_number": "ADMIN",
            "gender": "ADMIN"
        }

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
            "cell_number",
            "gender"
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