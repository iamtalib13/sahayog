import frappe


def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Employee Code", "fieldname": "employee", "fieldtype": "Link", "options": "Employee", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 180},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 150},
        {"label": "Department", "fieldname": "department", "fieldtype": "Data", "width": 140},
        {"label": "Leave Type", "fieldname": "leave_type", "fieldtype": "Data", "width": 130},
        {"label": "Allocated", "fieldname": "total_leaves_allocated", "fieldtype": "Float", "width": 90},
        {"label": "Used", "fieldname": "used_leaves", "fieldtype": "Float", "width": 80},
        {"label": "Balance", "fieldname": "unused_leaves", "fieldtype": "Float", "width": 80},
        {"label": "Carry Forwarded", "fieldname": "carry_forwarded_leaves_count", "fieldtype": "Float", "width": 130},
    ]

    conditions = "AND e.custom_is_support_staff = 1"
    if filters.get("employee"):
        conditions += " AND la.employee = %(employee)s"
    if filters.get("branch"):
        conditions += " AND e.branch = %(branch)s"
    if filters.get("leave_type"):
        conditions += " AND la.leave_type = %(leave_type)s"

    data = frappe.db.sql(f"""
        SELECT
            la.employee,
            e.employee_name,
            e.branch,
            e.department,
            la.leave_type,
            la.total_leaves_allocated,
            la.carry_forwarded_leaves_count,
            la.from_date,
            la.to_date,
            -- Calculate actual used leaves within allocation period
            COALESCE((
                SELECT SUM(lapp.total_leave_days)
                FROM `tabLeave Application` lapp
                WHERE lapp.employee = la.employee
                  AND lapp.leave_type = la.leave_type
                  AND lapp.status = 'Approved'
                  AND lapp.docstatus = 1
                  AND lapp.from_date >= la.from_date
                  AND lapp.to_date <= la.to_date
            ), 0) AS used_leaves,
            -- Calculate actual balance
            (la.total_leaves_allocated - COALESCE((
                SELECT SUM(lapp.total_leave_days)
                FROM `tabLeave Application` lapp
                WHERE lapp.employee = la.employee
                  AND lapp.leave_type = la.leave_type
                  AND lapp.status = 'Approved'
                  AND lapp.docstatus = 1
                  AND lapp.from_date >= la.from_date
                  AND lapp.to_date <= la.to_date
            ), 0)) AS unused_leaves
        FROM `tabLeave Allocation` la
        INNER JOIN `tabEmployee` e ON e.name = la.employee
        WHERE la.docstatus = 1
            AND %(today)s BETWEEN la.from_date AND la.to_date
            {conditions}
        ORDER BY e.branch, e.employee_name, la.leave_type
    """, {**filters, "today": frappe.utils.today()}, as_dict=1)

    return columns, data
