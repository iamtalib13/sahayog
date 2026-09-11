"""
Salary Revision / Appraisal — revision applies from the effective date,
history is preserved (past Salary Registers are untouched snapshots).
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate


@frappe.whitelist()
def apply_salary_revision(employee, new_salary, effective_date, reason=None):
    """Apply appraisal revision: logs history + updates Employee CTC.

    Past finalized payroll data is never overwritten (registers are snapshots).
    """
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    if not frappe.db.exists("Employee", employee):
        frappe.throw(_("Employee {0} not found").format(employee))
    new_salary = flt(new_salary)
    if new_salary <= 0:
        frappe.throw(_("Revised salary must be greater than zero"))

    old_salary = flt(frappe.db.get_value("Employee", employee, "ctc"))
    rev = frappe.get_doc({
        "doctype": "Salary Revision",
        "employee": employee,
        "old_salary": old_salary,
        "new_salary": new_salary,
        "effective_date": getdate(effective_date),
        "reason": reason,
        "applied_by": frappe.session.user,
    })
    rev.insert(ignore_permissions=True)
    frappe.db.set_value("Employee", employee, "ctc", new_salary)
    return {"success": True,
            "message": _("Salary revised {0} → {1} w.e.f. {2}").format(
                old_salary, new_salary, effective_date),
            "revision": rev.name}


@frappe.whitelist()
def get_salary_history(employee):
    """Revision history for an employee (current CTC + past revisions)."""
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    current = flt(frappe.db.get_value("Employee", employee, "ctc"))
    revisions = frappe.get_all(
        "Salary Revision", filters={"employee": employee},
        fields=["name", "old_salary", "new_salary", "effective_date",
                "reason", "applied_by", "creation"],
        order_by="effective_date desc")
    return {"current_salary": current, "revisions": revisions}
