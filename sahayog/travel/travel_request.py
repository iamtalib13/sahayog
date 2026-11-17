import frappe
from frappe import _
from frappe.share import add_docshare
from frappe.utils import add_days, cint, flt, getdate, today

# Workflow states (kept here so notifications stay easy to change).
PENDING_MANAGER = "Pending Reporting Manager"
PENDING_FNA = "Pending F&A Approval"
PENDING_COO = "Pending COO Approval"
APPROVED = "Approved"
REJECTED = "Rejected"


def before_insert(doc, method=None):
    # The workflow auto-created field is hidden; make sure a new request
    # always starts in the first state even if the client omitted it.
    if not doc.get("workflow_state"):
        doc.workflow_state = "Draft"


def validate(doc, method=None):
    validate_dates(doc)
    validate_manager(doc)
    validate_advance(doc)
    validate_deviation(doc)
    show_policy_hints(doc)


def on_update(doc, method=None):
    share_with_reporting_manager(doc)
    notify_state_change(doc)


def validate_dates(doc):
    if doc.departure_date and doc.return_date:
        if getdate(doc.return_date) < getdate(doc.departure_date):
            frappe.throw(_("Return Date cannot be before Departure Date."))


def validate_manager(doc):
    if not doc.reporting_manager:
        return

    if doc.reporting_manager == doc.employee:
        frappe.throw(_("Reporting Manager cannot be the same as the Employee."))

    manager_user = frappe.db.get_value("Employee", doc.reporting_manager, "user_id")
    if not manager_user:
        frappe.throw(
            _(
                "Reporting Manager {0} does not have a linked User. "
                "Please ask HR to link a User before submitting the request."
            ).format(frappe.bold(doc.reporting_manager))
        )


def validate_advance(doc):
    if not cint(doc.advance_required):
        return

    if flt(doc.advance_amount) <= 0:
        frappe.throw(_("Advance Amount is required when Advance Required is checked."))

    if not doc.advance_justification:
        frappe.throw(
            _("Advance Justification is required when Advance Required is checked.")
        )

    if doc.departure_date:
        earliest = add_working_days(today(), 2)
        if getdate(doc.departure_date) < earliest:
            frappe.msgprint(
                _(
                    "Travel advance should normally be applied at least "
                    "2 working days before departure (policy 3.9)."
                ),
                title=_("Advance Timing"),
                indicator="orange",
            )


def validate_deviation(doc):
    if cint(doc.deviation_requested) and not doc.deviation_reason:
        frappe.throw(
            _("Deviation Reason is required when Deviation Requested is checked.")
        )


def show_policy_hints(doc):
    if doc.mode_of_travel == "Air":
        frappe.msgprint(
            _(
                "Air travel must be Economy class on the lowest fare. "
                "Any exception is a policy deviation and needs COO approval."
            ),
            title=_("Travel Policy"),
            indicator="blue",
            alert=True,
        )


def add_working_days(start_date, days):
    """Add working days, skipping Saturdays and Sundays."""
    date = getdate(start_date)
    added = 0
    while added < days:
        date = add_days(date, 1)
        if date.weekday() < 5:
            added += 1
    return date


def share_with_reporting_manager(doc):
    """Give the selected reporting manager access to this request.

    Employee role is restricted to own documents, so a DocShare is the
    lightest way to let the manager open and approve the request without
    creating a separate manager role for every employee.
    """
    if not doc.reporting_manager:
        return

    manager_user = frappe.db.get_value("Employee", doc.reporting_manager, "user_id")
    if not manager_user or manager_user == doc.owner:
        return

    add_docshare(
        doc.doctype,
        doc.name,
        user=manager_user,
        read=1,
        write=1,
        share=1,
        submit=1,
        notify=0,
        flags={"ignore_share_permission": True},
    )


def notify_state_change(doc):
    previous = doc.get_doc_before_save()
    old_state = previous.get("workflow_state") if previous else None
    new_state = doc.get("workflow_state")

    if not new_state or new_state == old_state:
        return

    if new_state == PENDING_MANAGER:
        _notify_employee(
            doc.reporting_manager,
            _("Travel request {0} is waiting for your approval").format(doc.name),
            doc,
        )
    elif new_state == PENDING_COO:
        _notify_role(
            "Travel Policy Approver",
            _("Travel request {0} has a policy deviation and needs approval").format(
                doc.name
            ),
            doc,
        )
    elif new_state in (APPROVED, REJECTED):
        _notify_user(
            doc.owner,
            _("Travel request {0} has been {1}").format(doc.name, new_state.lower()),
            doc,
        )


def _notify_employee(employee, subject, doc):
    if not employee:
        return
    user = frappe.db.get_value("Employee", employee, "user_id")
    if user:
        _notify_user(user, subject, doc)


def _notify_role(role, subject, doc):
    for user in frappe.get_all(
        "Has Role", filters={"role": role, "parenttype": "User"}, pluck="parent"
    ):
        _notify_user(user, subject, doc)


def _notify_user(user, subject, doc):
    if not user or user in ("Administrator", "Guest"):
        return

    try:
        frappe.get_doc(
            {
                "doctype": "Notification Log",
                "subject": subject,
                "for_user": user,
                "document_type": doc.doctype,
                "document_name": doc.name,
            }
        ).insert(ignore_permissions=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Travel Request notification failed")

    email = frappe.db.get_value("Employee", {"user_id": user}, "company_email") or frappe.db.get_value(
        "User", user, "email"
    )
    if not email:
        return

    try:
        frappe.sendmail(
            recipients=[email],
            subject=subject,
            message=(
                f"<p>{subject}</p>"
                f"<p>Employee: <b>{doc.employee_name or doc.employee}</b></p>"
                f"<p>Route: {doc.from_city or ''} → {doc.to_city or ''}</p>"
                f"<p><a href=\"{frappe.utils.get_url()}/app/travel-request/{doc.name}\">"
                "Open Travel Request</a></p>"
            ),
            delayed=True,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Travel Request email failed")
