import frappe
from frappe import _
from frappe.utils import getdate

@frappe.whitelist(allow_guest=False)
def get_leave_types():
    return frappe.get_all("Leave Type", fields=["name"])

@frappe.whitelist(allow_guest=False)
def apply_leave(employee, leave_type, from_date, to_date, reason=None):
    if not employee or not leave_type:
        frappe.throw(_("Employee and Leave Type are required"))

    doc = frappe.get_doc({
        "doctype": "Leave Application",
        "employee": employee,
        "leave_type": leave_type,
        "from_date": from_date,
        "to_date": to_date,
        "description": reason or "Applied via Portal",
        "status": "Open"
    })

    doc.insert(ignore_permissions=True)
    return {
        "success": True,
        "message": _("Leave Applied Successfully"),
        "name": doc.name
    }

@frappe.whitelist(allow_guest=False)
def get_pending_leaves():
    manager = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
    if not manager: return []

    employees = frappe.get_all("Employee", filters={"reports_to": manager}, pluck="name")
    
    return frappe.get_all("Leave Application",
        filters={"employee": ["in", employees], "status": ["in", ["Open", "Approved"]]},
        fields=["name", "employee", "leave_type", "from_date", "to_date", "status"],
        order_by="from_date desc"
    )

@frappe.whitelist(allow_guest=False)
def update_leave_status(leave_id, status):
    if status not in ["Approved", "Rejected"]:
        frappe.throw(_("Invalid status"))

    doc = frappe.get_doc("Leave Application", leave_id)
    doc.status = status
    
    # Submitting an approved leave automatically handles balance deduction in HRMS
    if status == "Approved":
        # Temporarily elevate permissions to submit
        current_user = frappe.session.user
        frappe.set_user("Administrator")
        try:
            doc.submit()
        finally:
            frappe.set_user(current_user)
    else:
        doc.save(ignore_permissions=True)

    return {"success": True, "message": _("Leave {0}").format(status)}
