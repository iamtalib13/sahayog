import frappe
from frappe import _
from frappe.utils import cint


ALLOWED_ROLES = ["HO Petty Cash Manager", "HO Petty Cash Verifier"]
TARGET_ROLE = "Branch User"


def get_eligible_designations():
    """Get eligible designations dynamically from Sahayog Settings."""
    settings = frappe.get_cached_doc("Sahayog Settings")

    designations = [
        row.designations
        for row in settings.get("allowed_access_manager_designations") or []
        if row.designations
    ]

    if not designations:
        frappe.throw(
            _(
                "No eligible designations are configured in Sahayog Settings. "
                "Please add designations in the Petty Cash Management settings."
            )
        )

    return designations


def validate_access():
    """Allow only authorized users to use this access manager."""
    if frappe.session.user == "Administrator":
        return True

    frappe.only_for(ALLOWED_ROLES)


# def get_all_branches():
#     """Load every branch from Sahayog Branch. Branch identity/value = sol_id."""
#     return frappe.get_all(
#         "Sahayog Branch",
#         fields=["name", "sol_id", "branch"],
#         order_by="branch asc",
#     )


def get_all_branches():
    """Load every branch from Branch Petty Cash Account."""
    return frappe.get_all(
        "Branch Petty Cash Account",
        fields=["name", "branch", "branch_name"],
        order_by="branch_name asc",
    )


def get_employees_with_branch_user_role():
    """Return employees whose linked User has the Branch User role."""
    users_with_role = frappe.get_all(
        "Has Role",
        filters={
            "role": TARGET_ROLE,
            "parenttype": "User",
        },
        pluck="parent",
    )

    if not users_with_role:
        return []

    return frappe.get_all(
        "Employee",
        filters={
            "user_id": ["in", users_with_role],
            "petty_cash_branch": ["is", "set"],
        },
        fields=[
            "name",
            "employee_name",
            "designation",
            "user_id",
            "petty_cash_branch",
        ],
        order_by="employee_name asc",
    )


# def get_branch_label(branch_id):
#     if not branch_id:
#         return "Unknown"

#     return frappe.db.get_value(
#         "Sahayog Branch",
#         {"sol_id": branch_id},
#         "branch",
#     ) or "Unknown"


def get_branch_label(branch_id):
    if not branch_id:
        return "Unknown"

    return frappe.db.get_value(
        "Branch Petty Cash Account",
        {"branch": branch_id},
        "branch_name",
    ) or "Unknown"


# @frappe.whitelist()
# def get_branch_access_data():
#     validate_access()

#     eligible_designations = get_eligible_designations()

#     all_branches = get_all_branches()

#     employees = get_employees_with_branch_user_role()
#     employees = [
#         emp for emp in employees
#         if emp.designation in eligible_designations
#     ]

#     employees_by_branch = {}

#     for emp in employees:
#         branch_id = emp.petty_cash_branch

#         if branch_id not in employees_by_branch:
#             employees_by_branch[branch_id] = []

#         employees_by_branch[branch_id].append(
#             {
#                 "name": emp.name,
#                 "employee_name": emp.employee_name,
#                 "designation": emp.designation,
#                 "user_id": emp.user_id,
#                 "petty_cash_branch": emp.petty_cash_branch,
#                 "has_branch_user_role": True,
#             }
#         )

#     branch_list = []

#     for branch in all_branches:
#         branch_id = branch.sol_id

#         if not branch_id:
#             continue

#         branch_list.append(
#             {
#                 "branch_id": branch_id,
#                 "branch_name": branch.branch or branch_id,
#                 "employees": employees_by_branch.get(branch_id, []),
#             }
#         )

#     branch_list.sort(key=lambda x: x["branch_name"].lower())

#     return branch_list


@frappe.whitelist()
def get_branch_access_data():
    validate_access()

    cleanup_disabled_user_access()

    all_branches = get_all_branches()

    employees = get_employees_with_branch_user_role()

    employees_by_branch = {}

    for emp in employees:
        branch_id = emp.petty_cash_branch

        if branch_id not in employees_by_branch:
            employees_by_branch[branch_id] = []

        employees_by_branch[branch_id].append(
            {
                "name": emp.name,
                "employee_name": emp.employee_name,
                "designation": emp.designation,
                "user_id": emp.user_id,
                "petty_cash_branch": emp.petty_cash_branch,
                "has_branch_user_role": True,
            }
        )

    branch_list = []

    # for branch in all_branches:
    #     branch_id = branch.sol_id

    #     if not branch_id:
    #         continue

    #     branch_list.append(
    #         {
    #             "branch_id": branch_id,
    #             "branch_name": branch.branch or branch_id,
    #             "employees": employees_by_branch.get(branch_id, []),
    #         }
    #     )

    for branch in all_branches:
        branch_id = branch.branch

        # if not branch_id:
        #     continue

        if not branch_id or branch_id == "1000":
            continue

        branch_list.append(
            {
                "branch_id": branch_id,
                "branch_name": branch.branch_name or branch_id,
                "employees": employees_by_branch.get(branch_id, []),
            }
        )

    branch_list.sort(key=lambda x: x["branch_name"].lower())

    return branch_list


@frappe.whitelist()
def search_eligible_employees(search_text=""):
    validate_access()

    eligible_designations = get_eligible_designations()

    search_text = (search_text or "").strip()

    filters = {
        "designation": ["in", eligible_designations],
        "user_id": ["is", "set"],
    }

    or_filters = []

    if search_text:
        or_filters = [
            ["Employee", "employee_name", "like", f"%{search_text}%"],
            ["Employee", "user_id", "like", f"%{search_text}%"],
            ["Employee", "name", "like", f"%{search_text}%"],
        ]

    employees = frappe.get_all(
        "Employee",
        filters=filters,
        or_filters=or_filters,
        fields=[
            "name",
            "employee_name",
            "designation",
            "user_id",
            "petty_cash_branch",
        ],
        order_by="employee_name asc",
        limit_page_length=20,
    )

    users_with_role = set(
        frappe.get_all(
            "Has Role",
            filters={
                "role": TARGET_ROLE,
                "parenttype": "User",
                "parent": [
                    "in",
                    [emp.user_id for emp in employees] or [""],
                ],
            },
            pluck="parent",
        )
    )

    for emp in employees:
        emp.has_branch_user_role = emp.user_id in users_with_role
        emp.branch_name = (
            get_branch_label(emp.petty_cash_branch)
            if emp.petty_cash_branch
            else ""
        )

    return employees


def validate_employee_eligibility(employee):
    """Validate that the employee designation is allowed in Sahayog Settings."""
    eligible_designations = get_eligible_designations()

    if employee.designation not in eligible_designations:
        frappe.throw(
            _(
                "This employee is not eligible for Branch User access management."
            )
        )


def get_existing_branch_employee(branch_id, current_employee=None):
    """Return the employee currently assigned to a branch, if any."""
    filters = {
        "petty_cash_branch": branch_id,
        "user_id": ["is", "set"],
    }

    if current_employee:
        filters["name"] = ["!=", current_employee]

    return frappe.db.get_value(
        "Employee",
        filters,
        ["name", "employee_name", "user_id"],
        as_dict=True,
    )


def remove_branch_access(employee_name):
    """Clear branch and remove Branch User role from the previous employee."""
    employee = frappe.get_doc("Employee", employee_name)

    old_branch = employee.petty_cash_branch
    user_id = employee.user_id

    employee.petty_cash_branch = None
    employee.save(ignore_permissions=True)

    if user_id and frappe.db.exists("User", user_id):
        user = frappe.get_doc("User", user_id)
        current_roles = {row.role for row in user.roles if row.role}

        if TARGET_ROLE in current_roles:
            user.roles = [
                row for row in user.roles if row.role != TARGET_ROLE
            ]
            user.save(ignore_permissions=True)
            clear_user_access_cache(user_id)

    if old_branch:
        frappe.logger("petty_cash_access_ma").info(
            {
                "action_by": frappe.session.user,
                "action_on": user_id,
                "employee": employee_name,
                "role": TARGET_ROLE,
                "branch": old_branch,
                "status": "access_removed",
            }
        )


def clear_user_access_cache(user_id):
    """Clear cached permissions/session data for the updated user."""
    frappe.clear_cache(user=user_id)
    frappe.clear_cache()


# @frappe.whitelist()
# def toggle_branch_user_role(user_id, enable, branch_id=None):
#     validate_access()

#     if not user_id:
#         frappe.throw(_("No User ID linked to this employee."))

#     if user_id == "Administrator":
#         frappe.throw(
#             _("Administrator role access cannot be changed from this page.")
#         )

#     if not frappe.db.exists("User", user_id):
#         frappe.throw(
#             _("User {0} does not exist.").format(frappe.bold(user_id))
#         )

#     employee_name = frappe.db.get_value(
#         "Employee",
#         {"user_id": user_id},
#         "name",
#     )

#     if not employee_name:
#         frappe.throw(
#             _("No Employee is linked to user {0}.").format(
#                 frappe.bold(user_id)
#             )
#         )

#     employee = frappe.get_doc("Employee", employee_name)

#     validate_employee_eligibility(employee)

#     enable = cint(frappe.parse_json(enable))
#     branch_id = (branch_id or "").strip()

#     if enable:
#         if not branch_id:
#             frappe.throw(_("Please select a branch."))

#         branch = frappe.db.get_value(
#             "Sahayog Branch",
#             {"sol_id": branch_id},
#             ["name", "branch"],
#             as_dict=True,
#         )

#         if not branch:
#             frappe.throw(
#                 _("Branch {0} does not exist.").format(
#                     frappe.bold(branch_id)
#                 )
#             )

#         existing_employee = get_existing_branch_employee(
#             branch_id=branch_id,
#             current_employee=employee.name,
#         )

#         if existing_employee:
#             remove_branch_access(existing_employee.name)

#         employee.petty_cash_branch = branch_id
#     else:
#         employee.petty_cash_branch = None

#     employee.save(ignore_permissions=True)

#     user = frappe.get_doc("User", user_id)
#     current_roles = {row.role for row in user.roles if row.role}

#     changed = False
#     status = "unchanged"

#     if enable:
#         if TARGET_ROLE not in current_roles:
#             user.append("roles", {"role": TARGET_ROLE})
#             status = "added"
#             changed = True
#         else:
#             status = "already_present"
#     else:
#         if TARGET_ROLE in current_roles:
#             user.roles = [
#                 row for row in user.roles if row.role != TARGET_ROLE
#             ]
#             status = "removed"
#             changed = True
#         else:
#             status = "already_absent"

#     if changed:
#         user.save(ignore_permissions=True)
#         clear_user_access_cache(user_id)

#         frappe.logger("petty_cash_access_ma").info(
#             {
#                 "action_by": frappe.session.user,
#                 "action_on": user_id,
#                 "role": TARGET_ROLE,
#                 "branch": branch_id if enable else None,
#                 "status": status,
#             }
#         )

#     if hasattr(frappe.local, "message_log"):
#         frappe.local.message_log = []

#     return {
#         "status": status,
#         "user_id": user_id,
#         "employee": employee.name,
#         "branch_id": employee.petty_cash_branch,
#         "branch_name": (
#             get_branch_label(employee.petty_cash_branch)
#             if employee.petty_cash_branch
#             else ""
#         ),
#         "role": TARGET_ROLE,
#     }


@frappe.whitelist()
def toggle_branch_user_role(user_id, enable, branch_id=None):
    validate_access()

    if not user_id:
        frappe.throw(_("No User ID linked to this employee."))

    if user_id == "Administrator":
        frappe.throw(
            _("Administrator role access cannot be changed from this page.")
        )

    if not frappe.db.exists("User", user_id):
        frappe.throw(
            _("User {0} does not exist.").format(frappe.bold(user_id))
        )

    employee_name = frappe.db.get_value(
        "Employee",
        {"user_id": user_id},
        "name",
    )

    if not employee_name:
        frappe.throw(
            _("No Employee is linked to user {0}.").format(
                frappe.bold(user_id)
            )
        )

    employee = frappe.get_doc("Employee", employee_name)

    enable = cint(frappe.parse_json(enable))
    branch_id = (branch_id or "").strip()

    if enable:
        validate_employee_eligibility(employee)

        if not branch_id:
            frappe.throw(_("Please select a branch."))

        branch = frappe.db.get_value(
            "Sahayog Branch",
            {"sol_id": branch_id},
            ["name", "branch"],
            as_dict=True,
        )

        if not branch:
            frappe.throw(
                _("Branch {0} does not exist.").format(
                    frappe.bold(branch_id)
                )
            )

        existing_employee = get_existing_branch_employee(
            branch_id=branch_id,
            current_employee=employee.name,
        )

        if existing_employee:
            remove_branch_access(existing_employee.name)

        employee.petty_cash_branch = branch_id
    else:
        employee.petty_cash_branch = None

    employee.save(ignore_permissions=True)

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
            user.roles = [
                row for row in user.roles if row.role != TARGET_ROLE
            ]
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
                "branch": branch_id if enable else None,
                "status": status,
            }
        )

    if hasattr(frappe.local, "message_log"):
        frappe.local.message_log = []

    return {
        "status": status,
        "user_id": user_id,
        "employee": employee.name,
        "branch_id": employee.petty_cash_branch,
        "branch_name": (
            get_branch_label(employee.petty_cash_branch)
            if employee.petty_cash_branch
            else ""
        ),
        "role": TARGET_ROLE,
    }


@frappe.whitelist()
def reassign_employee_branch(user_id, branch_id):
    validate_access()

    if not user_id:
        frappe.throw(_("No User ID linked to this employee."))

    if not branch_id:
        frappe.throw(_("Please select a branch."))

    employee_name = frappe.db.get_value(
        "Employee",
        {"user_id": user_id},
        "name",
    )

    if not employee_name:
        frappe.throw(
            _("No Employee is linked to user {0}.").format(
                frappe.bold(user_id)
            )
        )

    branch = frappe.db.get_value(
        "Sahayog Branch",
        {"sol_id": branch_id},
        ["name", "branch"],
        as_dict=True,
    )

    if not branch:
        frappe.throw(
            _("Branch {0} does not exist.").format(frappe.bold(branch_id))
        )

    employee = frappe.get_doc("Employee", employee_name)

    validate_employee_eligibility(employee)

    old_branch_id = employee.petty_cash_branch
    old_branch_name = get_branch_label(old_branch_id) if old_branch_id else ""

    employee.petty_cash_branch = branch_id
    employee.save(ignore_permissions=True)

    frappe.logger("petty_cash_access_ma").info(
        {
            "action_by": frappe.session.user,
            "action_on": user_id,
            "employee": employee.name,
            "old_branch": old_branch_id,
            "new_branch": branch_id,
            "status": "branch_reassigned",
        }
    )

    return {
        "status": "reassigned",
        "user_id": user_id,
        "employee": employee.name,
        "old_branch_id": old_branch_id,
        "old_branch_name": old_branch_name,
        "new_branch_id": branch_id,
        "new_branch_name": branch.branch or branch_id,
    }


@frappe.whitelist()
def replace_branch_employee(user_id, branch_id):
    validate_access()

    if not user_id:
        frappe.throw(_("No User ID linked to this employee."))

    if not branch_id:
        frappe.throw(_("Please select a branch."))

    branch = frappe.db.get_value(
        "Sahayog Branch",
        {"sol_id": branch_id},
        ["name", "branch"],
        as_dict=True,
    )

    if not branch:
        frappe.throw(
            _("Branch {0} does not exist.").format(frappe.bold(branch_id))
        )

    new_employee_name = frappe.db.get_value(
        "Employee",
        {"user_id": user_id},
        "name",
    )

    if not new_employee_name:
        frappe.throw(
            _("No Employee is linked to user {0}.").format(
                frappe.bold(user_id)
            )
        )

    new_employee = frappe.get_doc("Employee", new_employee_name)

    validate_employee_eligibility(new_employee)

    existing_employee = get_existing_branch_employee(
        branch_id=branch_id,
        current_employee=new_employee.name,
    )

    if existing_employee:
        remove_branch_access(existing_employee.name)

    new_employee.petty_cash_branch = branch_id
    new_employee.save(ignore_permissions=True)

    user = frappe.get_doc("User", user_id)
    current_roles = {row.role for row in user.roles if row.role}

    role_status = "already_present"

    if TARGET_ROLE not in current_roles:
        user.append("roles", {"role": TARGET_ROLE})
        role_status = "added"
        user.save(ignore_permissions=True)
        clear_user_access_cache(user_id)

    frappe.logger("petty_cash_access_ma").info(
        {
            "action_by": frappe.session.user,
            "action_on": user_id,
            "employee": new_employee.name,
            "role": TARGET_ROLE,
            "branch": branch_id,
            "replaced_employee": (
                existing_employee.name if existing_employee else None
            ),
            "status": "branch_employee_replaced",
        }
    )

    return {
        "status": "replaced",
        "user_id": user_id,
        "employee": new_employee.name,
        "employee_name": new_employee.employee_name,
        "branch_id": branch_id,
        "branch_name": branch.branch or branch_id,
        "replaced_employee": (
            existing_employee.employee_name if existing_employee else None
        ),
        "role_status": role_status,
    }


@frappe.whitelist()
def reassign_and_replace_branch_employee(user_id, branch_id):
    validate_access()

    if not user_id:
        frappe.throw(_("No User ID linked to this employee."))

    if not branch_id:
        frappe.throw(_("Please select a branch."))

    branch = frappe.db.get_value(
        "Sahayog Branch",
        {"sol_id": branch_id},
        ["name", "branch"],
        as_dict=True,
    )

    if not branch:
        frappe.throw(
            _("Branch {0} does not exist.").format(frappe.bold(branch_id))
        )

    new_employee_name = frappe.db.get_value(
        "Employee",
        {"user_id": user_id},
        "name",
    )

    if not new_employee_name:
        frappe.throw(
            _("No Employee is linked to user {0}.").format(
                frappe.bold(user_id)
            )
        )

    new_employee = frappe.get_doc("Employee", new_employee_name)

    validate_employee_eligibility(new_employee)

    existing_target_employee = get_existing_branch_employee(
        branch_id=branch_id,
        current_employee=new_employee.name,
    )

    if existing_target_employee:
        remove_branch_access(existing_target_employee.name)

    old_branch_id = new_employee.petty_cash_branch
    old_branch_name = get_branch_label(old_branch_id) if old_branch_id else ""

    new_employee.petty_cash_branch = branch_id
    new_employee.save(ignore_permissions=True)

    frappe.logger("petty_cash_access_ma").info(
        {
            "action_by": frappe.session.user,
            "action_on": user_id,
            "employee": new_employee.name,
            "old_branch": old_branch_id,
            "new_branch": branch_id,
            "replaced_employee": (
                existing_target_employee.name
                if existing_target_employee
                else None
            ),
            "status": "reassigned_and_replaced",
        }
    )

    return {
        "status": "reassigned_and_replaced",
        "user_id": user_id,
        "employee": new_employee.name,
        "employee_name": new_employee.employee_name,
        "old_branch_id": old_branch_id,
        "old_branch_name": old_branch_name,
        "new_branch_id": branch_id,
        "new_branch_name": branch.branch or branch_id,
        "replaced_employee": (
            existing_target_employee.employee_name
            if existing_target_employee
            else None
        ),
    }


def cleanup_disabled_user_access():
    """Remove Branch User role and petty_cash_branch from disabled users."""

    disabled_users = frappe.get_all(
        "User",
        filters={
            "enabled": 0,
            "name": ["!=", "Administrator"],
        },
        pluck="name",
    )

    if not disabled_users:
        return

    employees = frappe.get_all(
        "Employee",
        filters={
            "user_id": ["in", disabled_users],
            "petty_cash_branch": ["is", "set"],
        },
        fields=["name", "user_id", "petty_cash_branch"],
    )

    for emp in employees:
        employee = frappe.get_doc("Employee", emp.name)

        old_branch = employee.petty_cash_branch
        employee.petty_cash_branch = None
        employee.save(ignore_permissions=True)

        user = frappe.get_doc("User", emp.user_id)
        current_roles = {row.role for row in user.roles if row.role}

        if TARGET_ROLE in current_roles:
            user.roles = [
                row for row in user.roles if row.role != TARGET_ROLE
            ]
            user.save(ignore_permissions=True)
            clear_user_access_cache(emp.user_id)

        frappe.logger("petty_cash_access_ma").info(
            {
                "action_by": frappe.session.user,
                "action_on": emp.user_id,
                "employee": emp.name,
                "role": TARGET_ROLE,
                "branch": old_branch,
                "status": "disabled_user_access_cleaned",
            }
        )
