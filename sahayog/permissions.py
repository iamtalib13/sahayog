import frappe

def get_lead_permission(user, doctype=None):
    if not user:
        user = frappe.session.user

    user_roles = frappe.get_roles(user)
    
    # Allow full access for these roles
    if "Administrator" in user_roles or "Sales Manager" in user_roles:
        return ""

    conditions = []

    # Get employee record
    employee = frappe.db.get_value(
        "Employee",
        {"user_id": user},
        ["branch", "custom_zone", "custom_region"],
        as_dict=True
    )

    if "Branch Manager" in user_roles and employee and employee.branch:
        conditions.append(f"`tabLead`.custom_branch = '{employee.branch}'")

    if "Zonal Manager" in user_roles and employee and employee.custom_zone:
        conditions.append(f"`tabLead`.custom_zone = '{employee.custom_zone}'")

    if "Regional Manager" in user_roles and employee and employee.custom_region:
        conditions.append(f"`tabLead`.custom_region = '{employee.custom_region}'")

    # Also allow access if user owns or is assigned to the lead
    conditions.append(f"`tabLead`.owner = '{user}'")
    conditions.append(f"`tabLead`._assign LIKE '%\"{user}\"%'")

    return " or ".join(conditions) if conditions else ""



# Set the permissions visibility on doc of Appointment
def get_appointment_permission(user):
    if not user:
        user = frappe.session.user

    # Allow Administrator and Sales Manager to see all records
    user_roles = frappe.get_roles(user)
    if "Administrator" in user_roles or "Sales Manager" in user_roles:
        return ""

    conditions = []

   # Extra access for Branch Manager
    if "Branch Manager" in user_roles:
        user_branch = frappe.db.get_value("Employee", {"user_id": user}, "branch")
        if user_branch:
            # Add condition: show appointments linked to Leads in same branch
            conditions.append(f"""
                (
                    `tabAppointment`.appointment_with = 'Lead'
                    AND EXISTS (
                        SELECT 1 FROM `tabLead`
                        WHERE `tabLead`.name = `tabAppointment`.party
                        AND `tabLead`.custom_branch = '{user_branch}'
                    )
                )
            """)

    conditions.append(f"`tabAppointment`.owner = '{user}'")

    # Add condition for assigned user (stored as a JSON string in _assign)
    #conditions.append(f"`tabAppointment`._assign LIKE '%\"{user}\"%'")

    # Add condition for escalated user if used
    # conditions.append(f"`tabAppointment`.custom_escalated_to = '{user}'")

    return " or ".join(conditions) if conditions else ""

def get_task_permission(user):
    """Filter Task list based on user roles and assignment"""
    if not user:
        user = frappe.session.user

    # Roles jo hamesha sab tasks dekh sakte hain
    allowed_roles = ["System Manager", "Task Manager", "Project Manager"]
    user_roles = frappe.get_roles(user)
    if any(role in allowed_roles for role in user_roles):
        return ""  # no filter, show all tasks

    # Employees: only tasks where they are in _assign
    # safe LIKE filter
    return f"""(`tabTask`.`_assign` LIKE '%"{user}"%')"""

# permission query_conditions for purchase receipt based on warehouse(inward)
def get_purchase_receipt_permission_for_warehouse(user, doctype=None):
    if not user:
        user = frappe.session.user

    # Admin can see all
    if user == "Administrator":
        return ""

    # Allow owner to see their own records
    # Also allow warehouse match
    return f"""
        (`tabPurchase Receipt`.owner = '{user}'
        or exists(
            select 1
            from `tabDefault Warehouse` dw
            where dw.parenttype = 'Sahayog Settings'
            and dw.user_id = '{user}'
            and dw.warehouse = `tabPurchase Receipt`.set_warehouse
        ))
    """

def get_stock_entry_permission_for_warehouse(user, doctype=None):
    if not user:
        user = frappe.session.user

    if user == "Administrator":
        return ""

    return f"""
        (
            `tabStock Entry`.owner = '{user}'
            or exists(
                select 1
                from `tabDefault Warehouse` dw
                where dw.parenttype = 'Sahayog Settings'
                and dw.user_id = '{user}'
                and dw.warehouse = `tabStock Entry`.from_warehouse
            )
        )
    """
