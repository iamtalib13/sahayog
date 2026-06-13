import frappe
from frappe import _
from frappe.utils import getdate

@frappe.whitelist(allow_guest=False)
def get_leave_types():
    return frappe.get_all("Leave Type", fields=["name"])

from sahayog.api.attendance import get_leave_balances

@frappe.whitelist(allow_guest=False)
def apply_leave(employee, leave_type, from_date, to_date, reason=None):
    if not employee or not leave_type:
        frappe.throw(_("Employee and Leave Type are required"))

    # Check Balance
    balances = get_leave_balances(employee)
    leave_bal = next((b for b in balances if b.leave_type == leave_type), None)
    
    if not leave_bal:
        frappe.throw(_("No leave allocation found for {0}").format(leave_type))
        
    # Calculate requested days
    from frappe.utils import date_diff, getdate
    requested_days = date_diff(getdate(to_date), getdate(from_date)) + 1
    
    if leave_bal.unused_leaves < requested_days:
        frappe.throw(_("Insufficient balance. Available: {0}, Requested: {1}").format(leave_bal.unused_leaves, requested_days))

    # Get Holiday List
    holiday_list = frappe.db.get_value("Employee", employee, "holiday_list")
    if not holiday_list:
        company = frappe.db.get_value("Employee", employee, "company")
        if company:
            holiday_list = frappe.db.get_value("Company", company, "default_holiday_list")

    doc_data = {
        "doctype": "Leave Application",
        "employee": employee,
        "leave_type": leave_type,
        "from_date": from_date,
        "to_date": to_date,
        "description": reason or "Applied via Portal",
        "status": "Open"
    }
    
    if holiday_list:
        doc_data["holiday_list"] = holiday_list

    doc = frappe.get_doc(doc_data)
    
    doc.insert(ignore_permissions=True)
    return {
        "success": True,
        "message": _("Leave Applied Successfully"),
        "name": doc.name
    }

@frappe.whitelist(allow_guest=False)
def get_pending_leaves():
    manager = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
    if not manager: return {"pending": [], "history": []}

    employees = frappe.get_all("Employee", filters={"reports_to": manager}, pluck="name")
    
    # Fetch all applications
    leaves = frappe.get_all("Leave Application",
        filters={"employee": ["in", employees]},
        fields=["name", "employee", "leave_type", "from_date", "to_date", "status"],
        order_by="from_date desc"
    )
    
    pending = []
    history = []
    
    for l in leaves:
        l["employee_name"] = frappe.db.get_value("Employee", l.employee, "employee_name")
        if l.status == "Open":
            pending.append(l)
        else:
            history.append(l)
            
    return {"pending": pending, "history": history}

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
