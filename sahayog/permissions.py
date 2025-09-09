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
    return " or ".join(conditions) if conditions else ""

def get_purchase_receipt_permission(user, doctype=None):
    if not user:
        user = frappe.session.user

    # Admin can see all
    if user == "Administrator":
        return ""

    # Match Purchase Receipt.custom_item_department with Sahayog Setting child row
    return f"""
        exists(
            select 1
            from `tabDefault Warehouse` dw
            where dw.parenttype = 'Sahayog Settings'
            and dw.user_id = '{user}'
            and dw.item_department = `tabPurchase Receipt`.custom_department
        )
    """

def get_stock_entry_permission(user, doctype=None):
    if not user:
        user = frappe.session.user

    # Admin can see all
    if user == "Administrator":
        return ""

    # Match Stock Entry.custom_item_department with Sahayog Setting child row
    return f"""
        exists(
            select 1
            from `tabDefault Warehouse` dw
            where dw.parenttype = 'Sahayog Settings'
            and dw.user_id = '{user}'
            and dw.item_department = `tabStock Entry`.custom_department
        )
    """