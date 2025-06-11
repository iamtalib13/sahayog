import frappe

def get_lead_permission(user):
    if not user:
        user = frappe.session.user

    # Allow Administrator and Sales Manager to see all records
    user_roles = frappe.get_roles(user)
    if "Administrator" in user_roles or "Sales Manager" in user_roles:
        return ""

    conditions = []

    # Check if the user is a Branch Manager
    if "Branch Manager" in user_roles:
        # Fetch branch of the user from Employee doctype
        user_branch = frappe.db.get_value('Employee', {'user_id': user}, 'branch')
        
        if user_branch:
            # Add condition to show only leads of the same branch
            conditions.append(f"`tabLead`.custom_branch = '{user_branch}'")

    # Add condition for the owner
    conditions.append(f"`tabLead`.owner = '{user}'")

    # Add condition for assigned user (stored as a JSON string in _assign)
    conditions.append(f"`tabLead`._assign LIKE '%\"{user}\"%'")

    # Add condition for escalated user (stored as a Data field in custom_escalated_to)
    #conditions.append(f"`tabLead`.custom_escalated_to = '{user}'")

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

    # Check if the user is a Branch Manager
    if "Branch Manager" in user_roles:
        # Fetch branch of the user from Employee doctype
        user_branch = frappe.db.get_value('Employee', {'user_id': user}, 'branch')
        
        if user_branch:
            # Add condition to show only appointments of the same branch
            conditions.append(f"`tabAppointment`.custom_branch = '{user_branch}'")

    # Add condition for the owner
    conditions.append(f"`tabAppointment`.owner = '{user}'")

    # Add condition for assigned user (stored as a JSON string in _assign)
    conditions.append(f"`tabAppointment`._assign LIKE '%\"{user}\"%'")

    # Add condition for escalated user if used
    # conditions.append(f"`tabAppointment`.custom_escalated_to = '{user}'")

    return " or ".join(conditions) if conditions else ""