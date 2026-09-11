"""
Staff Loan (Peon Staff) — Loan Register API.
Loans auto-reflect as Staff Loan EMI in the salary sheet; on payroll Paid,
balances update and fully-recovered loans close. History via repayments.
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate


def _check_hr():
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)


@frappe.whitelist()
def create_staff_loan(employee, loan_amount, emi_amount, disbursed_date=None, remarks=None):
    """Create a loan entry (balance starts = full loan amount)."""
    _check_hr()
    if not frappe.db.exists("Employee", employee):
        frappe.throw(_("Employee {0} not found").format(employee))
    if not frappe.db.get_value("Employee", employee, "custom_is_support_staff"):
        frappe.throw(_("This register is only for Support Staff employees"))
    loan_amount, emi_amount = flt(loan_amount), flt(emi_amount)
    if loan_amount <= 0 or emi_amount <= 0:
        frappe.throw(_("Loan amount and EMI must be greater than zero"))

    loan = frappe.get_doc({
        "doctype": "Staff Loan",
        "employee": employee,
        "loan_amount": loan_amount,
        "emi_amount": emi_amount,
        "disbursed_date": getdate(disbursed_date) if disbursed_date else None,
        "balance_amount": loan_amount,
        "status": "Open",
        "remarks": remarks,
    })
    loan.insert(ignore_permissions=True)
    return {"success": True, "message": _("Loan {0} created").format(loan.name),
            "loan": loan.name}


@frappe.whitelist()
def get_staff_loans(employee=None, status=None):
    """Loan register list (Desk + portal use)."""
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    filters = {}
    if employee:
        filters["employee"] = employee
    if status:
        filters["status"] = status
    return frappe.get_all(
        "Staff Loan", filters=filters,
        fields=["name", "employee", "employee_name", "loan_amount", "emi_amount",
                "disbursed_date", "balance_amount", "status", "last_paid_month"],
        order_by="creation desc")


@frappe.whitelist()
def get_loan_history(employee):
    """Complete loan history (loans + EMI repayments) for an employee."""
    loans = get_staff_loans(employee=employee)
    names = [l.name for l in loans]
    repayments = []
    if names:
        repayments = frappe.get_all(
            "Staff Loan Repayment", filters={"loan": ["in", names]},
            fields=["name", "loan", "employee", "payroll_month", "amount", "payroll_run"],
            order_by="payroll_month desc")
    return {"loans": loans, "repayments": repayments}


@frappe.whitelist()
def close_staff_loan(loan):
    """Manually close a fully-recovered loan."""
    _check_hr()
    bal = flt(frappe.db.get_value("Staff Loan", loan, "balance_amount"))
    if bal > 0:
        frappe.throw(_("Balance {0} still pending. Loan cannot be closed.").format(bal))
    frappe.db.set_value("Staff Loan", loan, "status", "Closed")
    return {"success": True, "message": _("Loan {0} closed").format(loan)}


def get_open_emi_total(employee):
    """Sum of EMIs of Open loans (0 if none) — used by salary generation."""
    rows = frappe.db.sql(
        """SELECT COALESCE(SUM(emi_amount), 0) AS emi FROM `tabStaff Loan`
           WHERE employee=%s AND status='Open'""", employee, as_dict=True)
    return flt(rows[0].emi) if rows else 0


def settle_loans_on_paid(employee, amount, payroll_month, payroll_run):
    """Allocate paid EMI across Open loans (oldest first); close at zero."""
    remaining = flt(amount)
    if remaining <= 0:
        return
    loans = frappe.get_all(
        "Staff Loan", filters={"employee": employee, "status": "Open"},
        fields=["name", "balance_amount"], order_by="creation asc")
    for ln in loans:
        if remaining <= 0:
            break
        bal = flt(ln.balance_amount)
        if bal <= 0:
            frappe.db.set_value("Staff Loan", ln.name, "status", "Closed")
            continue
        paid = min(remaining, bal)
        frappe.get_doc({
            "doctype": "Staff Loan Repayment",
            "loan": ln.name, "employee": employee,
            "payroll_month": payroll_month, "amount": paid,
            "payroll_run": payroll_run,
        }).insert(ignore_permissions=True)
        new_bal = bal - paid
        frappe.db.set_value("Staff Loan", ln.name, {
            "balance_amount": new_bal,
            "last_paid_month": payroll_month,
            "status": "Closed" if new_bal <= 0 else "Open"})
        remaining -= paid
