import frappe


def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Employee Code", "fieldname": "name", "fieldtype": "Link", "options": "Employee", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 180},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 150},
        {"label": "Department", "fieldname": "department", "fieldtype": "Data", "width": 140},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 140},
        {"label": "Date of Joining", "fieldname": "date_of_joining", "fieldtype": "Date", "width": 110},
        {"label": "Bank Name", "fieldname": "bank_name", "fieldtype": "Data", "width": 130},
        {"label": "Bank Account No", "fieldname": "bank_ac_no", "fieldtype": "Data", "width": 140},
        {"label": "Monthly Gross Salary", "fieldname": "ctc", "fieldtype": "Currency", "width": 160},
    ]

    conditions = "WHERE custom_is_support_staff = 1 AND status = 'Active'"
    if filters.get("branch"):
        conditions += " AND branch = %(branch)s"
    if filters.get("department"):
        conditions += " AND department = %(department)s"

    data = frappe.db.sql(f"""
        SELECT
            name, employee_name, branch, department, designation,
            date_of_joining, bank_name, bank_ac_no, ctc
        FROM `tabEmployee`
        {conditions}
        ORDER BY branch, employee_name
    """, filters, as_dict=1)

    return columns, data
