import frappe
from frappe import _
from frappe.utils import flt, getdate

@frappe.whitelist(allow_guest=False)
def get_leave_types(employee=None):
    leave_types = frappe.get_all("Leave Type", fields=["name"])

    # If employee provided, check EL eligibility (requires confirmation)
    el_eligible = True
    confirmation_date = None
    if employee:
        emp = frappe.db.get_value(
            "Employee", employee,
            ["final_confirmation_date", "employee_name"],
            as_dict=True
        )
        if emp:
            from frappe.utils import getdate, today
            confirmation_date = str(emp.final_confirmation_date) if emp.final_confirmation_date else None
            el_eligible = bool(
                emp.final_confirmation_date and
                getdate(emp.final_confirmation_date) <= getdate(today())
            )

    for lt in leave_types:
        lt["el_restricted"] = (
            not el_eligible and "earned" in lt.name.lower()
        )
        lt["confirmation_date"] = confirmation_date

    return leave_types

from sahayog.api.attendance import get_leave_balances

@frappe.whitelist(allow_guest=False)
def apply_leave(employee, leave_type, from_date, to_date, reason=None, force=False, half_day=False):
    from frappe.utils import date_diff, getdate, formatdate

    if not employee or not leave_type:
        frappe.throw(_("Employee and Leave Type are required"))

    # Normalize force param (comes as string from API call)
    if isinstance(force, str):
        force = force.lower() in ("true", "1", "yes")

    # Normalize half_day param (comes as string from API call)
    if isinstance(half_day, str):
        half_day = half_day.lower() in ("true", "1", "yes")

    # Half day can only be applied for a single day
    if half_day:
        to_date = from_date

    # Earned Leave is only available after confirmation (permanent employees only)
    if "earned" in leave_type.lower():
        emp_data = frappe.db.get_value(
            "Employee", employee,
            ["final_confirmation_date", "employee_name"],
            as_dict=True
        )
        if not emp_data or not emp_data.final_confirmation_date:
            frappe.throw(_(
                "Earned Leave can only be availed after confirmation. "
                "{0} has not been confirmed yet."
            ).format(emp_data.employee_name if emp_data else employee))
        if getdate(from_date) < getdate(emp_data.final_confirmation_date):
            frappe.throw(_(
                "Earned Leave can only be availed on or after the Date of Confirmation ({0}). "
                "{1} is still on probation until that date."
            ).format(emp_data.final_confirmation_date, emp_data.employee_name))

    # Check Balance
    balances = get_leave_balances(employee)
    leave_bal = next((b for b in balances if b.leave_type == leave_type), None)
    
    if not leave_bal:
        frappe.throw(_("No leave allocation found for {0}").format(leave_type))
        
    # Calculate requested days
    requested_days = 0.5 if half_day else date_diff(getdate(to_date), getdate(from_date)) + 1
    
    if leave_bal.unused_leaves < requested_days:
        frappe.throw(_("Insufficient balance. Available: {0}, Requested: {1}").format(leave_bal.unused_leaves, requested_days))

    # Cross-lock: do not allow leave on dates already locked by an approved regularization
    locked_correction = frappe.db.exists("Attendance Correction", {
        "employee": employee,
        "status": "Approved",
        "attendance_date": ["between", [from_date, to_date]]
    })
    if locked_correction:
        frappe.throw(_(
            "Leave cannot be applied because regularization has already been approved "
            "for one or more dates in this period."
        ))

    # Block overlapping leave with a clean, HTML-free message.
    # HRMS's default overlap error embeds a raw <a href> tag that the portal
    # would otherwise render as literal text.
    overlap = frappe.db.get_value(
        "Leave Application",
        {
            "employee": employee,
            "docstatus": ["<", 2],
            "status": ["not in", ["Rejected", "Cancelled"]],
            "from_date": ["<=", to_date],
            "to_date": [">=", from_date],
        },
        ["name", "leave_type", "from_date", "to_date"],
        as_dict=True,
    )
    if overlap:
        if overlap.from_date == overlap.to_date:
            date_str = "for " + formatdate(overlap.from_date, "dd-MMM-yyyy")
        else:
            date_str = "from {0} to {1}".format(
                formatdate(overlap.from_date, "dd-MMM-yyyy"),
                formatdate(overlap.to_date, "dd-MMM-yyyy"),
            )
        frappe.throw(_("{0} already applied {1}. Leave Application: {2}").format(
            overlap.leave_type, date_str, overlap.name
        ))

    # Get Holiday List
    holiday_list = frappe.db.get_value("Employee", employee, "holiday_list")
    if not holiday_list:
        company = frappe.db.get_value("Employee", employee, "company")
        if company:
            holiday_list = frappe.db.get_value("Company", company, "default_holiday_list")

    # Check if any date in range is a holiday — warn instead of hard block
    if holiday_list and not force:
        holidays = frappe.db.sql("""
            SELECT holiday_date, description FROM `tabHoliday`
            WHERE parent = %(hl)s
              AND holiday_date BETWEEN %(from)s AND %(to)s
              AND weekly_off = 0
        """, {"hl": holiday_list, "from": from_date, "to": to_date}, as_dict=True)
        if holidays:
            holiday_dates = [str(h.holiday_date) for h in holidays]
            holiday_names = ["{0} ({1})".format(str(h.holiday_date), h.description or "Holiday") for h in holidays]
            return {
                "success": False,
                "is_holiday": True,
                "holiday_dates": holiday_dates,
                "holiday_names": holiday_names,
                "message": "Leave period includes holidays: {0}".format(", ".join(holiday_names))
            }

    doc_data = {
        "doctype": "Leave Application",
        "employee": employee,
        "leave_type": leave_type,
        "from_date": from_date,
        "to_date": to_date,
        "description": reason or "Applied via Portal",
        "status": "Open"
    }

    if half_day:
        doc_data["half_day"] = 1
        doc_data["half_day_date"] = from_date
    
    if holiday_list:
        doc_data["holiday_list"] = holiday_list

    doc = frappe.get_doc(doc_data)
    
    doc.insert(ignore_permissions=True)

    # Deduct leave balance immediately at apply time (advance deduction).
    # On approval this entry is removed and re-created by the standard HRMS
    # submit; on rejection it is deleted, which refunds the balance.
    _create_advance_deduction(doc, requested_days, holiday_list)

    return {
        "success": True,
        "message": _("Leave Applied Successfully"),
        "name": doc.name
    }


def _create_advance_deduction(doc, requested_days, holiday_list):
    """Create a negative Leave Ledger Entry so the balance drops at apply time."""
    from hrms.hr.doctype.leave_ledger_entry.leave_ledger_entry import create_leave_ledger_entry

    is_lwp = frappe.db.get_value("Leave Type", doc.leave_type, "is_lwp") or 0
    args = dict(
        leaves=flt(requested_days) * -1,
        from_date=getdate(doc.from_date),
        to_date=getdate(doc.to_date),
        is_lwp=is_lwp,
        holiday_list=holiday_list or "",
    )
    create_leave_ledger_entry(doc, args, submit=True)


def _delete_advance_deduction(leave_application_name):
    """Remove the advance-deduction ledger entry for an Open leave application.
    Precise delete by transaction_name — an Open application has exactly one
    ledger entry (the advance deduction), so allocation/expiry entries are safe."""
    frappe.db.sql(
        "DELETE FROM `tabLeave Ledger Entry` WHERE transaction_name = %s",
        (leave_application_name,),
    )

@frappe.whitelist(allow_guest=False)
def get_pending_leaves():
    user = frappe.session.user
    roles = frappe.get_roles(user)
    emp_data = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, ["name", "sahayog_branch", "sol_id", "custom_is_support_staff"], as_dict=True)
    
    # Access Control: Only HR, Branch Manager, Admin, or Support Staff can access
    is_authorized_manager = any(r in roles for r in ["HR Manager", "HR User", "Branch Manager", "Administrator"])
    is_support_staff = emp_data.custom_is_support_staff if emp_data else False
    
    if not (is_authorized_manager or is_support_staff):
        frappe.throw(_("Access denied. This portal is only for support staff and authorized managers."), frappe.PermissionError)

    # Base filters for all employees in scope
    employee_filters = {}

    if "HR Manager" in roles or "HR User" in roles or user == "Administrator":
        # HR/Admin gets all active staff
        employee_filters = {"status": "Active", "custom_is_support_staff": 1}
    elif "Branch Manager" in roles and emp_data:
        branch_id = emp_data.sahayog_branch or emp_data.sol_id
        if branch_id:
            employee_filters = {"sahayog_branch": branch_id, "status": "Active", "custom_is_support_staff": 1}
        else:
            employee_filters = {"reports_to": emp_data.name, "status": "Active", "custom_is_support_staff": 1}
    elif emp_data:
        employee_filters = {"reports_to": emp_data.name, "status": "Active", "custom_is_support_staff": 1}
    else:
        return {"pending": [], "history": []}

    employees = frappe.get_all("Employee", filters=employee_filters, pluck="name")
    if not employees: return {"pending": [], "history": []}
    
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

    # Balance was already deducted at apply time. Remove that advance entry now —
    # on Approval the standard HRMS submit re-creates the deduction; on Rejection
    # this removal IS the refund. No-op for legacy leaves without an advance entry.
    _delete_advance_deduction(doc.name)

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
