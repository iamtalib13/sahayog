import frappe
from frappe import _
from frappe.utils import getdate


def validate(doc, method):
    """Restrict Earned Leave before confirmation — EL credits from DOJ but
    can only be availed after the date of confirmation."""
    if doc.leave_type != "Earned Leave":
        return

    employee = frappe.get_doc("Employee", doc.employee)
    if not employee.final_confirmation_date:
        frappe.throw(
            _("Earned Leave cannot be availed before confirmation. Your employment is not yet confirmed."),
            title=_("Earned Leave Restricted"),
        )

    if getdate(doc.from_date) < getdate(employee.final_confirmation_date):
        frappe.throw(
            _("Earned Leave can only be availed after the date of confirmation ({0}).").format(
                frappe.format(employee.final_confirmation_date)
            ),
            title=_("Earned Leave Restricted"),
        )
