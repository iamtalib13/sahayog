# import frappe

# def validate_access():
#     """Ensure the user has one of the required roles to use this module."""
#     if frappe.session.user == "Administrator":
#         return True

#     allowed_roles = ["HO Petty Cash Manager", "HO Petty Cash Verifier"]
#     user_roles = frappe.get_roles(frappe.session.user)

#     if not any(role in user_roles for role in allowed_roles):
#         frappe.throw("You do not have permission to access Petty Cash Management configurations.", frappe.PermissionError)

# @frappe.whitelist()
# def get_eligible_employees():
#     validate_access()

#     employees = frappe.get_all(
#         "Employee",
#         filters={
#             "designation": ["in", ["Branch Operation Manager", "Branch Manager"]],
#             "user_id": ["is", "set"]
#         },
#         fields=["name", "employee_name", "designation", "user_id", "sahayog_branch"],
#         order_by="employee_name asc"
#     )

#     for emp in employees:
#         if emp.sahayog_branch:
#             branch_name = frappe.db.get_value("Sahayog Branch", emp.sahayog_branch, "branch")
#             emp.branch_name = branch_name or "Unknown"
#         else:
#             emp.branch_name = "N/A"

#     return employees

# @frappe.whitelist()
# def get_employee_role_status(user_id):
#     validate_access()

#     if not user_id:
#         return False
#     has_role = frappe.db.exists("Has Role", {"parent": user_id, "role": "Branch User"})
#     return bool(has_role)

# @frappe.whitelist()
# def toggle_branch_user_role(user_id, enable):
#     validate_access()

#     if not user_id:
#         frappe.throw("No User ID linked to this employee.")

#     enable = frappe.parse_json(enable)
#     user = frappe.get_doc("User", user_id)

#     if enable:
#         user.add_roles("Branch User")
#         status = "added"
#     else:
#         user.remove_roles("Branch User")
#         status = "removed"

#     # Clear any system messages to prevent frontend modals
#     if hasattr(frappe.local, 'message_log'):
#         frappe.local.message_log = []

#     return {"status": status}


import frappe
from frappe import _
from frappe.utils import cint


ALLOWED_ROLES = ["HO Petty Cash Manager", "HO Petty Cash Verifier"]
TARGET_ROLE = "Branch User"
ELIGIBLE_DESIGNATIONS = ["Branch Operation Manager", "BRANCH MANAGER"]


def validate_access():
    """Allow only authorized users to use this access manager."""
    if frappe.session.user == "Administrator":
        return True

    frappe.only_for(ALLOWED_ROLES)


def validate_target_user(user_id):
    """Validate the target user before changing roles."""
    if not user_id:
        frappe.throw(_("No User ID linked to this employee."))

    if user_id == "Administrator":
        frappe.throw(
            _("Administrator role access cannot be changed from this page."))

    if not frappe.db.exists("User", user_id):
        frappe.throw(_("User {0} does not exist.").format(
            frappe.bold(user_id)))

    employee = frappe.db.get_value(
        "Employee",
        {"user_id": user_id},
        ["name", "designation", "status"],
        as_dict=True,
    )

    if not employee:
        frappe.throw(_("No Employee is linked to user {0}.").format(
            frappe.bold(user_id)))

    if employee.designation not in ELIGIBLE_DESIGNATIONS:
        frappe.throw(
            _("This employee is not eligible for Branch User access management.")
        )

    return employee


def clear_user_access_cache(user_id):
    """Clear cached permissions/session data for the updated user."""
    frappe.clear_cache(user=user_id)
    frappe.clear_cache()


@frappe.whitelist()
def get_eligible_employees():
    validate_access()

    employees = frappe.get_all(
        "Employee",
        filters={
            "designation": ["in", ELIGIBLE_DESIGNATIONS],
            "user_id": ["is", "set"]
        },
        fields=["name", "employee_name", "designation",
                "user_id", "sahayog_branch"],
        order_by="employee_name asc"
    )

    for emp in employees:
        if emp.sahayog_branch:
            branch_name = frappe.db.get_value(
                "Sahayog Branch", emp.sahayog_branch, "branch")
            emp.branch_name = branch_name or "Unknown"
        else:
            emp.branch_name = "N/A"

    return employees


@frappe.whitelist()
def get_employee_role_status(user_id):
    validate_access()

    if not user_id:
        return False

    return bool(
        frappe.db.exists(
            "Has Role",
            {"parent": user_id, "role": TARGET_ROLE}
        )
    )


@frappe.whitelist()
def toggle_branch_user_role(user_id, enable):
    validate_access()
    validate_target_user(user_id)

    enable = cint(frappe.parse_json(enable))

    user = frappe.get_doc("User", user_id)
    current_roles = {row.role for row in user.roles if row.role}

    changed = False
    status = "unchanged"

    if enable:
        if TARGET_ROLE not in current_roles:
            user.append("roles", {"role": TARGET_ROLE})
            status = "added"
            changed = True
        else:
            status = "already_present"
    else:
        if TARGET_ROLE in current_roles:
            user.roles = [row for row in user.roles if row.role != TARGET_ROLE]
            status = "removed"
            changed = True
        else:
            status = "already_absent"

    if changed:
        user.save(ignore_permissions=True)
        clear_user_access_cache(user_id)

        frappe.logger("petty_cash_access_ma").info(
            {
                "action_by": frappe.session.user,
                "action_on": user_id,
                "role": TARGET_ROLE,
                "status": status,
            }
        )

    if hasattr(frappe.local, "message_log"):
        frappe.local.message_log = []

    return {
        "status": status,
        "user_id": user_id,
        "role": TARGET_ROLE,
    }
