import frappe
from frappe import _

HR_ROLES = ("HR Manager", "HR User", "Administrator")
REQUEST_ROLES = ("Branch Manager", "HR Manager", "HR User", "Administrator")


def _is_hr():
    roles = frappe.get_roles(frappe.session.user)
    return any(r in roles for r in HR_ROLES)


def _hr_users():
    rows = frappe.get_all(
        "Has Role",
        filters={"role": ["in", ["HR Manager", "HR User"]], "parenttype": "User"},
        pluck="parent",
    )
    return sorted(set(rows))


@frappe.whitelist()
def get_my_branch():
    """Return the current user's assigned branch (code + name) for the request form."""
    user_emp = frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        ["sahayog_branch"],
        as_dict=True,
    )
    if not user_emp or not user_emp.sahayog_branch:
        return {"name": None, "branch": "your branch"}
    branch_name = frappe.db.get_value(
        "Sahayog Branch", user_emp.sahayog_branch, "branch"
    )
    return {
        "name": user_emp.sahayog_branch,
        "branch": branch_name or user_emp.sahayog_branch,
    }


def _notify(user, subject, doc):
    if not user:
        return
    frappe.get_doc(
        {
            "doctype": "Notification Log",
            "subject": subject,
            "for_user": user,
            "document_type": doc.doctype,
            "document_name": doc.name,
        }
    ).insert(ignore_permissions=True)


@frappe.whitelist()
def create_request(
    employee_name,
    gender,
    date_of_birth,
    date_of_joining,
    designation=None,
    branch=None,
    department=None,
    contact_number=None,
    remarks=None,
):
    """Portal: Branch Manager submits an employee creation request for HR approval."""
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in REQUEST_ROLES):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    if not (employee_name and gender and date_of_birth and date_of_joining):
        frappe.throw(
            _("Name, Gender, Date of Birth and Date of Joining are required.")
        )

    user_emp = frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        ["name", "sahayog_branch"],
        as_dict=True,
    )
    if not user_emp:
        frappe.throw(_("No Employee record linked to your user account."))

    # A Branch Manager can only request for their own branch.
    is_hr = any(r in roles for r in ("HR Manager", "Administrator"))
    if not is_hr:
        branch = user_emp.sahayog_branch or branch
    if not branch:
        frappe.throw(_("Branch is required."))

    doc = frappe.get_doc(
        {
            "doctype": "Employee Creation Request",
            "employee_name": employee_name.strip(),
            "gender": gender,
            "date_of_birth": date_of_birth,
            "date_of_joining": date_of_joining,
            "designation": designation,
            "branch": branch,
            "department": department,
            "contact_number": contact_number,
            "remarks": remarks,
        }
    )
    doc.insert(ignore_permissions=True)

    for user in _hr_users():
        if user != frappe.session.user:
            _notify(user, f"New employee creation request: {doc.employee_name}", doc)

    return {
        "success": True,
        "name": doc.name,
        "message": _("Request submitted for HR approval."),
    }


@frappe.whitelist()
def get_pending_requests():
    """Portal: HR sees pending employee creation requests."""
    if not _is_hr():
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    rows = frappe.get_all(
        "Employee Creation Request",
        filters={"status": "Pending Approval"},
        fields=[
            "name",
            "employee_name",
            "gender",
            "date_of_birth",
            "date_of_joining",
            "designation",
            "branch",
            "department",
            "contact_number",
            "requested_by",
            "creation",
        ],
        order_by="creation asc",
    )

    for row in rows:
        emp = frappe.db.get_value(
            "Employee",
            {"user_id": row["requested_by"]},
            ["name", "employee_name"],
            as_dict=True,
        )
        row["requested_by_code"] = emp.name if emp else ""
        row["requested_by_name"] = emp.employee_name if emp else row["requested_by"]
        row["branch_name"] = (
            frappe.db.get_value("Sahayog Branch", row["branch"], "branch")
            if row.get("branch")
            else ""
        )

    return rows


@frappe.whitelist()
def process_request(name, action, remark=None):
    """Portal: HR approves or rejects a request. Employee is created only on approval."""
    if not _is_hr():
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    if action not in ("Approved", "Rejected"):
        frappe.throw(_("Invalid action."))

    doc = frappe.get_doc("Employee Creation Request", name)
    if doc.status != "Pending Approval":
        frappe.throw(_("This request is already {0}.").format(doc.status))

    if action == "Approved":
        doc.created_employee = _create_employee(doc)

    doc.status = action
    doc.approved_by = frappe.session.user
    doc.action_remark = (remark or "").strip()

    frappe.flags.in_ecr_action = True
    try:
        doc.save(ignore_permissions=True)
    finally:
        frappe.flags.in_ecr_action = False

    _notify(
        doc.requested_by,
        f"Your employee creation request was {action}: {doc.employee_name}",
        doc,
    )

    return {
        "success": True,
        "message": _("Request {0}.").format(action),
        "employee": doc.created_employee,
    }


def _template_for_branch(branch):
    """Copy division/region/district/zone from an existing employee of the branch."""
    fields = ["custom_division", "custom_region", "custom_district", "custom_zone"]
    base = {"custom_district": ["!=", ""]}

    rows = []
    if branch:
        rows = frappe.get_all(
            "Employee",
            filters={**base, "sahayog_branch": branch},
            fields=fields,
            limit=20,
        )
    if not rows:
        rows = frappe.get_all("Employee", filters=base, fields=fields, limit=20)

    for row in rows:
        if not row.custom_zone or frappe.db.exists("Zone", row.custom_zone):
            return row
    return rows[0] if rows else {}


def _create_employee(doc):
    """Create the Employee. The existing P-series naming hook assigns the P-code."""
    template = _template_for_branch(doc.branch)
    parts = (doc.employee_name or "").split()
    company = (
        frappe.db.get_single_value("Global Defaults", "default_company") or "Sahayog"
    )

    emp = frappe.get_doc(
        {
            "doctype": "Employee",
            "first_name": parts[0] if parts else doc.employee_name,
            "last_name": " ".join(parts[1:]) or None,
            "employee_name": doc.employee_name,
            "gender": doc.gender,
            "date_of_birth": doc.date_of_birth,
            "date_of_joining": doc.date_of_joining,
            "company": company,
            "status": "Active",
            "custom_is_support_staff": 1,
            "employee_number": None,
            "designation": doc.designation,
            "sahayog_branch": doc.branch,
            "department": doc.department,
            "cell_number": doc.contact_number,
            "custom_division": template.get("custom_division"),
            "custom_region": template.get("custom_region"),
            "custom_district": template.get("custom_district"),
            "custom_zone": template.get("custom_zone"),
        }
    )
    emp.insert(ignore_permissions=True)
    return emp.name
