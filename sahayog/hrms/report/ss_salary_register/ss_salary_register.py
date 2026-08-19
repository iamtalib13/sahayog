import frappe
from datetime import date


def get_filters():
    today = date.today()
    if today.day >= 26:
        default_from = date(today.year, today.month, 25)
        to_month = today.month + 1
        to_year = today.year
        if to_month > 12:
            to_month = 1
            to_year += 1
        default_to = date(to_year, to_month, 26)
    else:
        prev_month = today.month - 1
        prev_year = today.year
        if prev_month == 0:
            prev_month = 12
            prev_year -= 1
        default_from = date(prev_year, prev_month, 25)
        default_to = date(today.year, today.month, 26)

    return [
        {
            "fieldname": "from_date",
            "label": "From Date",
            "fieldtype": "Date",
            "default": default_from,
            "reqd": 1,
        },
        {
            "fieldname": "to_date",
            "label": "To Date",
            "fieldtype": "Date",
            "default": default_to,
            "reqd": 1,
        },
        {
            "fieldname": "branch",
            "label": "Branch",
            "fieldtype": "Link",
            "options": "Sahayog Branch",
        },
    ]


def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Employee Code", "fieldname": "employee", "fieldtype": "Link", "options": "Employee", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 180},
        {"label": "Branch Code", "fieldname": "branch", "fieldtype": "Link", "options": "Sahayog Branch", "width": 100},
        {"label": "Branch Name", "fieldname": "branch_name", "fieldtype": "Data", "width": 150},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 140},
        {"label": "Payroll Month", "fieldname": "payroll_month", "fieldtype": "Data", "width": 100},
        {"label": "Gross Salary", "fieldname": "gross_salary", "fieldtype": "Currency", "width": 120},
        {"label": "Medical Deduction", "fieldname": "medical_deduction", "fieldtype": "Currency", "width": 120},
        {"label": "Staff Loan EMI", "fieldname": "staff_loan_emi", "fieldtype": "Currency", "width": 110},
        {"label": "Other Deduction", "fieldname": "other_deduction", "fieldtype": "Currency", "width": 110},
        {"label": "Total Deductions", "fieldname": "total_deductions", "fieldtype": "Currency", "width": 120},
        {"label": "Net Salary", "fieldname": "net_salary", "fieldtype": "Currency", "width": 120},
        {"label": "Bank Name", "fieldname": "bank_name", "fieldtype": "Data", "width": 130},
        {"label": "Bank Account No", "fieldname": "bank_account_no", "fieldtype": "Data", "width": 140},
    ]

    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    # Find Payroll Runs whose posting_date falls in the selected date range
    # Then filter Salary Register by those Payroll Runs
    conditions = "WHERE 1=1"

    if from_date and to_date:
        conditions += """
            AND sr.payroll_run IN (
                SELECT name FROM `tabPayroll Run`
                WHERE posting_date BETWEEN %(from_date)s AND %(to_date)s
            )
        """

    if filters.get("branch"):
        conditions += " AND sr.branch = %(branch)s"

    data = frappe.db.sql(f"""
        SELECT
            sr.employee, sr.employee_name,
            sr.branch, e.branch as branch_name,
            sr.designation, sr.payroll_month,
            sr.gross_salary, sr.medical_deduction, sr.staff_loan_emi,
            sr.other_deduction, sr.total_deductions, sr.net_salary,
            sr.bank_name, sr.bank_account_no
        FROM `tabSalary Register` sr
        LEFT JOIN `tabEmployee` e ON e.name = sr.employee
        {conditions}
        ORDER BY CAST(REGEXP_REPLACE(sr.employee, '[^0-9]', '') AS UNSIGNED), sr.employee
    """, {
        "from_date": from_date,
        "to_date": to_date,
        "branch": filters.get("branch"),
    }, as_dict=1)

    return columns, data
