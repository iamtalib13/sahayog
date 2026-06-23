import frappe
import calendar


def execute(filters=None):
    filters = filters or {}
    month = int(filters.get("month") or frappe.utils.now_datetime().month)
    year = int(filters.get("year") or frappe.utils.now_datetime().year)
    _, days_in_month = calendar.monthrange(year, month)
    from_date = f"{year}-{month:02d}-01"
    to_date = f"{year}-{month:02d}-{days_in_month}"

    columns = [
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 180},
        {"label": "Total Staff", "fieldname": "total_staff", "fieldtype": "Int", "width": 100},
        {"label": "Total Present", "fieldname": "present", "fieldtype": "Int", "width": 110},
        {"label": "Total Absent", "fieldname": "absent", "fieldtype": "Int", "width": 110},
        {"label": "Total Half Day", "fieldname": "half_day", "fieldtype": "Int", "width": 110},
        {"label": "Total On Leave", "fieldname": "on_leave", "fieldtype": "Int", "width": 110},
        {"label": "Attendance %", "fieldname": "attendance_pct", "fieldtype": "Float", "width": 110},
    ]

    branch_condition = ""
    if filters.get("branch"):
        branch_condition = "AND e.branch = %(branch)s"

    data = frappe.db.sql(f"""
        SELECT
            e.branch,
            COUNT(DISTINCT e.name) AS total_staff,
            SUM(a.status = 'Present') AS present,
            SUM(a.status = 'Absent') AS absent,
            SUM(a.status = 'Half Day') AS half_day,
            SUM(a.status = 'On Leave') AS on_leave,
            ROUND(
                SUM(a.status = 'Present') * 100.0 / NULLIF(COUNT(a.name), 0), 1
            ) AS attendance_pct
        FROM `tabEmployee` e
        LEFT JOIN `tabAttendance` a
            ON a.employee = e.name
            AND a.attendance_date BETWEEN %(from_date)s AND %(to_date)s
            AND a.docstatus = 1
        WHERE e.custom_is_support_staff = 1
            AND e.status = 'Active'
            {branch_condition}
        GROUP BY e.branch
        ORDER BY e.branch
    """, {**filters, "from_date": from_date, "to_date": to_date}, as_dict=1)

    return columns, data
