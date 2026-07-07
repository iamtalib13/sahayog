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
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 180},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 120},
        {"label": "Region", "fieldname": "region", "fieldtype": "Data", "width": 120},
        {"label": "Total Staff", "fieldname": "total_staff", "fieldtype": "Int", "width": 100},
        {"label": "Total Present", "fieldname": "present", "fieldtype": "Int", "width": 110},
        {"label": "Total Absent", "fieldname": "absent", "fieldtype": "Int", "width": 110},
        {"label": "Total Half Day", "fieldname": "half_day", "fieldtype": "Int", "width": 110},
        {"label": "Total On Leave", "fieldname": "on_leave", "fieldtype": "Int", "width": 110},
        {"label": "Work From Home", "fieldname": "work_from_home", "fieldtype": "Int", "width": 120},
        {"label": "Attendance %", "fieldname": "attendance_pct", "fieldtype": "Float", "width": 110, "precision": 1},
    ]

    conditions = ""
    
    if filters.get("branch"):
        conditions += " AND e.branch = %(branch)s"
    
    if filters.get("zone"):
        conditions += " AND e.custom_zone = %(zone)s"
    
    if filters.get("region"):
        conditions += " AND e.custom_region = %(region)s"

    data = frappe.db.sql(f"""
        SELECT
            e.branch,
            e.custom_zone as zone,
            e.custom_region as region,
            COUNT(DISTINCT e.name) AS total_staff,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
            SUM(CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END) AS half_day,
            SUM(CASE WHEN a.status = 'On Leave' THEN 1 ELSE 0 END) AS on_leave,
            SUM(CASE WHEN a.status = 'Work From Home' THEN 1 ELSE 0 END) AS work_from_home,
            ROUND(
                (SUM(CASE WHEN a.status IN ('Present', 'Work From Home') THEN 1 ELSE 0 END) * 100.0) 
                / NULLIF(COUNT(a.name), 0), 1
            ) AS attendance_pct
        FROM `tabEmployee` e
        LEFT JOIN `tabAttendance` a
            ON a.employee = e.name
            AND a.attendance_date BETWEEN %(from_date)s AND %(to_date)s
            AND a.docstatus = 1
        WHERE e.custom_is_support_staff = 1
            AND e.status = 'Active'
            {conditions}
        GROUP BY e.branch, e.custom_zone, e.custom_region
        ORDER BY e.custom_zone, e.custom_region, e.branch
    """, filters, as_dict=1)

    return columns, data
