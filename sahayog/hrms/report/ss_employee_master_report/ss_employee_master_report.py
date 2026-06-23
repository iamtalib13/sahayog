import frappe


def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Employee Code", "fieldname": "name", "fieldtype": "Link", "options": "Employee", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 180},
        {"label": "Gender", "fieldname": "gender", "fieldtype": "Data", "width": 80},
        {"label": "Date of Birth", "fieldname": "date_of_birth", "fieldtype": "Date", "width": 110},
        {"label": "Date of Joining", "fieldname": "date_of_joining", "fieldtype": "Date", "width": 110},
        {"label": "Date of Confirmation", "fieldname": "final_confirmation_date", "fieldtype": "Date", "width": 130},
        {"label": "Department", "fieldname": "department", "fieldtype": "Data", "width": 140},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 140},
        {"label": "Employment Type", "fieldname": "employment_type", "fieldtype": "Data", "width": 130},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 150},
        {"label": "Branch Code", "fieldname": "sahayog_branch", "fieldtype": "Data", "width": 110},
        {"label": "Zone", "fieldname": "custom_zone", "fieldtype": "Data", "width": 100},
        {"label": "Region", "fieldname": "custom_region", "fieldtype": "Data", "width": 100},
        {"label": "District", "fieldname": "custom_district", "fieldtype": "Data", "width": 120},
        {"label": "Mobile", "fieldname": "cell_number", "fieldtype": "Data", "width": 110},
        {"label": "PAN Number", "fieldname": "custom_pan_number", "fieldtype": "Data", "width": 120},
        {"label": "Aadhaar Number", "fieldname": "custom_aadhar_number", "fieldtype": "Data", "width": 130},
        {"label": "Bank Name", "fieldname": "bank_name", "fieldtype": "Data", "width": 130},
        {"label": "Bank Account No", "fieldname": "bank_ac_no", "fieldtype": "Data", "width": 140},
        {"label": "Reporting Manager", "fieldname": "reports_to", "fieldtype": "Data", "width": 140},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 80},
        {"label": "Relieving Date", "fieldname": "relieving_date", "fieldtype": "Date", "width": 110},
    ]

    conditions = "WHERE e.custom_is_support_staff = 1"
    if filters.get("status"):
        conditions += " AND e.status = %(status)s"
    if filters.get("branch"):
        conditions += " AND e.branch = %(branch)s"
    if filters.get("department"):
        conditions += " AND e.department = %(department)s"

    data = frappe.db.sql(f"""
        SELECT
            e.name, e.employee_name, e.gender, e.date_of_birth, e.date_of_joining,
            e.final_confirmation_date, e.department, e.designation, e.employment_type,
            e.branch, e.sahayog_branch, e.custom_zone, e.custom_region, e.custom_district,
            e.cell_number, e.custom_pan_number, e.custom_aadhar_number,
            e.bank_name, e.bank_ac_no, e.reports_to, e.status, e.relieving_date
        FROM `tabEmployee` e
        {conditions}
        ORDER BY e.branch, e.employee_name
    """, filters, as_dict=1)

    return columns, data
