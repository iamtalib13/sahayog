import frappe
from frappe.utils import getdate


def execute(filters=None):
    filters = filters or {}
    
    # Validate date filters
    if not filters.get("from_date"):
        frappe.throw("From Date is required")
    if not filters.get("to_date"):
        frappe.throw("To Date is required")
    
    from_date = getdate(filters.get("from_date"))
    to_date = getdate(filters.get("to_date"))
    
    if to_date < from_date:
        frappe.throw("To Date cannot be before From Date")

    columns = [
        {"label": "Employee Code", "fieldname": "employee", "fieldtype": "Link", "options": "Employee", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 180},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 150},
        {"label": "Department", "fieldname": "department", "fieldtype": "Data", "width": 140},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 140},
        {"label": "Present", "fieldname": "present", "fieldtype": "Int", "width": 80},
        {"label": "Absent", "fieldname": "absent", "fieldtype": "Int", "width": 80},
        {"label": "Half Day", "fieldname": "half_day", "fieldtype": "Int", "width": 90},
        {"label": "On Leave", "fieldname": "on_leave", "fieldtype": "Int", "width": 90},
        {"label": "Work From Home", "fieldname": "work_from_home", "fieldtype": "Int", "width": 120},
        {"label": "Total Marked", "fieldname": "total_marked", "fieldtype": "Int", "width": 110},
    ]

    conditions = "AND e.custom_is_support_staff = 1"
    
    if filters.get("employee"):
        conditions += " AND a.employee = %(employee)s"
    
    if filters.get("branch"):
        conditions += " AND e.branch = %(branch)s"
    
    if filters.get("department"):
        conditions += " AND e.department = %(department)s"
    
    if filters.get("designation"):
        conditions += " AND e.designation = %(designation)s"

    data = frappe.db.sql(f"""
        SELECT
            a.employee,
            e.employee_name,
            e.branch,
            e.department,
            e.designation,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
            SUM(CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END) AS half_day,
            SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END) AS on_leave,
            SUM(CASE WHEN a.status = 'Work From Home' THEN 1 ELSE 0 END) AS work_from_home,
            COUNT(a.name) AS total_marked
        FROM `tabAttendance` a
        INNER JOIN `tabEmployee` e ON e.name = a.employee
        WHERE a.attendance_date BETWEEN %(from_date)s AND %(to_date)s
            AND a.docstatus = 1
            {conditions}
        GROUP BY a.employee
        ORDER BY e.branch, e.employee_name
    """, filters, as_dict=1)

    return columns, data
