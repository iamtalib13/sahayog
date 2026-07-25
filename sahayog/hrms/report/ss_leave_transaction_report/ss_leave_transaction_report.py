import frappe
from frappe import _
from frappe.utils import getdate, flt
from datetime import date


def execute(filters=None):
    filters = filters or {}

    from_date = filters.get("from_date") or date.today().replace(day=1)
    to_date = filters.get("to_date") or date.today()

    if isinstance(from_date, str):
        from_date = getdate(from_date)
    if isinstance(to_date, str):
        to_date = getdate(to_date)

    columns = [
        {"label": "Employee Code", "fieldname": "employee", "fieldtype": "Link", "options": "Employee", "width": 110},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 170},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 140},
        {"label": "Department", "fieldname": "department", "fieldtype": "Data", "width": 130},
        {"label": "Leave Type", "fieldname": "leave_type", "fieldtype": "Link", "options": "Leave Type", "width": 130},
        {"label": "Transaction Date", "fieldname": "transaction_date", "fieldtype": "Date", "width": 110},
        {"label": "Transaction Type", "fieldname": "transaction_type", "fieldtype": "Data", "width": 140},
        {"label": "Reference", "fieldname": "reference", "fieldtype": "Dynamic Link", "options": "transaction_type", "width": 150},
        {"label": "Leaves (+ Credit / - Debit)", "fieldname": "leaves", "fieldtype": "Float", "width": 130},
        {"label": "Opening Balance", "fieldname": "opening_balance", "fieldtype": "Float", "width": 110},
        {"label": "Closing Balance", "fieldname": "closing_balance", "fieldtype": "Float", "width": 110},
        {"label": "From Date", "fieldname": "from_date", "fieldtype": "Date", "width": 100},
        {"label": "To Date", "fieldname": "to_date", "fieldtype": "Date", "width": 100},
        {"label": "Is Carry Forward", "fieldname": "is_carry_forward", "fieldtype": "Check", "width": 100},
        {"label": "Is LWP", "fieldname": "is_lwp", "fieldtype": "Check", "width": 80},
        {"label": "Is Expired", "fieldname": "is_expired", "fieldtype": "Check", "width": 80},
    ]

    conditions = "AND e.custom_is_support_staff = 1"
    emp_conditions = ""
    if filters.get("employee"):
        emp_conditions += " AND lle.employee = %(employee)s"
    if filters.get("branch"):
        emp_conditions += " AND e.branch = %(branch)s"
    if filters.get("department"):
        emp_conditions += " AND e.department = %(department)s"
    if filters.get("leave_type"):
        emp_conditions += " AND lle.leave_type = %(leave_type)s"

    # Fetch leave ledger entries for the period
    data = frappe.db.sql(f"""
        SELECT
            lle.employee,
            e.employee_name,
            e.branch,
            e.department,
            lle.leave_type,
            lle.from_date,
            lle.to_date,
            lle.transaction_type,
            lle.transaction_name AS reference,
            lle.leaves,
            lle.is_carry_forward,
            lle.is_lwp,
            lle.is_expired,
            lle.creation AS transaction_date
        FROM `tabLeave Ledger Entry` lle
        INNER JOIN `tabEmployee` e ON e.name = lle.employee
        WHERE lle.docstatus = 1
          AND e.custom_is_support_staff = 1
          AND (
            (lle.from_date BETWEEN %(from)s AND %(to)s)
            OR (lle.to_date BETWEEN %(from)s AND %(to)s)
            OR (lle.creation BETWEEN %(from)s AND %(to)s)
          )
          {emp_conditions}
        ORDER BY e.branch, e.employee_name, lle.leave_type, lle.creation
    """, {
        "from": from_date,
        "to": to_date,
        "employee": filters.get("employee"),
        "branch": filters.get("branch"),
        "department": filters.get("department"),
        "leave_type": filters.get("leave_type"),
    }, as_dict=True)

    if not data:
        return columns, []

    # Compute running balance per employee+leave_type
    # Fetch opening balances (all ledger entries before from_date)
    emp_leave_keys = set()
    for d in data:
        emp_leave_keys.add((d.employee, d.leave_type))

    opening_map = {}
    for emp, lt in emp_leave_keys:
        opening = frappe.db.sql("""
            SELECT SUM(leaves) as total
            FROM `tabLeave Ledger Entry`
            WHERE employee = %(emp)s
              AND leave_type = %(lt)s
              AND docstatus = 1
              AND creation < %(from)s
        """, {"emp": emp, "lt": lt, "from": from_date}, as_dict=True)
        opening_map[(emp, lt)] = flt(opening[0].total) if opening else 0

    # Add running balance to each row
    running = dict(opening_map)
    for row in data:
        key = (row.employee, row.leave_type)
        ob = running[key]
        leaves = flt(row.leaves)
        cb = ob + leaves
        row["opening_balance"] = ob
        row["leaves"] = leaves
        row["closing_balance"] = cb
        running[key] = cb

    return columns, data
