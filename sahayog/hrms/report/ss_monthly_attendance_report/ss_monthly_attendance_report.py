import frappe
from frappe.utils import getdate
import calendar


def execute(filters=None):
    filters = filters or {}
    month = int(filters.get("month") or frappe.utils.now_datetime().month)
    year = int(filters.get("year") or frappe.utils.now_datetime().year)
    _, days_in_month = calendar.monthrange(year, month)
    from_date = f"{year}-{month:02d}-01"
    to_date = f"{year}-{month:02d}-{days_in_month}"

    columns = [
        {"label": "Employee Code", "fieldname": "employee", "fieldtype": "Link", "options": "Employee", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 180},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 150},
        {"label": "Department", "fieldname": "department", "fieldtype": "Data", "width": 140},
        {"label": "Present", "fieldname": "present", "fieldtype": "Int", "width": 80},
        {"label": "Absent", "fieldname": "absent", "fieldtype": "Int", "width": 80},
        {"label": "Half Day", "fieldname": "half_day", "fieldtype": "Int", "width": 90},
        {"label": "On Leave", "fieldname": "on_leave", "fieldtype": "Int", "width": 90},
        {"label": "Total Marked", "fieldname": "total_marked", "fieldtype": "Int", "width": 110},
    ]

    conditions = "AND e.custom_is_support_staff = 1"
    if filters.get("employee"):
        conditions += " AND a.employee = %(employee)s"
    if filters.get("branch"):
        conditions += " AND e.branch = %(branch)s"

    data = frappe.db.sql(f"""
        SELECT
            a.employee,
            e.employee_name,
            e.branch,
            e.department,
            SUM(a.status = 'Present') AS present,
            SUM(a.status = 'Absent') AS absent,
            SUM(a.status = 'Half Day') AS half_day,
            SUM(a.status = 'On Leave') AS on_leave,
            COUNT(a.name) AS total_marked
        FROM `tabAttendance` a
        INNER JOIN `tabEmployee` e ON e.name = a.employee
        WHERE a.attendance_date BETWEEN %(from_date)s AND %(to_date)s
            AND a.docstatus = 1
            {conditions}
        GROUP BY a.employee
        ORDER BY e.branch, e.employee_name
    """, {**filters, "from_date": from_date, "to_date": to_date}, as_dict=1)

    return columns, data
