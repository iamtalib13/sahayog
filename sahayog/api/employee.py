import frappe
from frappe import _
from frappe.utils import getdate, date_diff

@frappe.whitelist()
def create_support_staff(data):
    """
    Create a new Employee (Support Staff) from the portal.
    Only HR and Admins are allowed.
    """
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized to create employees"), frappe.PermissionError)

    if isinstance(data, str):
        import json
        data = json.loads(data)

    # Validations
    if not data.get("employee_number"):
        frappe.throw(_("Employee Code is mandatory"))
    
    if frappe.db.exists("Employee", data.get("employee_number")):
        frappe.throw(_("Employee Code {0} already exists").format(data.get("employee_number")))

    # Date Validations
    doj = getdate(data.get("date_of_joining"))
    doc = getdate(data.get("scheduled_confirmation_date"))
    if doj and doc and date_diff(doc, doj) < 0:
        frappe.throw(_("Date of Confirmation cannot be earlier than Date of Joining"))

    # Reporting Manager Validation
    if data.get("reports_to") and not frappe.db.exists("Employee", data.get("reports_to")):
        frappe.throw(_("Reporting Manager {0} does not exist").format(data.get("reports_to")))

    # Prepare Employee Doc
    # Map incoming data to standard Frappe/HRMS fields
    new_emp = frappe.get_doc({
        "doctype": "Employee",
        "employee_number": data.get("employee_number"),
        "first_name": data.get("first_name"),
        "middle_name": data.get("middle_name"),
        "last_name": data.get("last_name"),
        "gender": data.get("gender"),
        "date_of_birth": data.get("date_of_birth"),
        "date_of_joining": data.get("date_of_joining"),
        "scheduled_confirmation_date": data.get("scheduled_confirmation_date"),
        "status": "Active",
        "company": data.get("company") or frappe.defaults.get_global_default("company"),
        "department": data.get("department"),
        "designation": data.get("designation"),
        "branch": data.get("branch"),
        "sahayog_branch": data.get("sahayog_branch"),
        "reports_to": data.get("reports_to"),
        "cell_number": data.get("mobile_number"),
        "personal_email": data.get("personal_email"),
        "bank_name": data.get("bank_name"),
        "bank_ac_no": data.get("bank_account_number"),
        "marital_status": data.get("marital_status"),
        "blood_group": data.get("blood_group"),
        "permanent_address": data.get("permanent_address"),
        "current_address": data.get("current_address"),
        "relieving_date": data.get("relieving_date"),
        "resignation_letter_date": data.get("resignation_letter_date"),
        "default_shift": data.get("shift"),
        "employment_type": data.get("employment_type"),
        
        # Custom Fields
        "custom_is_support_staff": 1,
        "custom_zone": data.get("zone"),
        "custom_region": data.get("region"),
        "custom_district": data.get("district_name"),
        "custom_division": data.get("division"),
        
        # Salary (Hidden from regular users, handled via DocType permissions usually)
        "ctc": data.get("monthly_gross_salary")
    })

    new_emp.insert(ignore_permissions=True)
    
    return {
        "success": True,
        "message": _("Employee {0} created successfully").format(new_emp.name),
        "employee": new_emp.name
    }

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
