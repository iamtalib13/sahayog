import frappe

def get_lead_permission_by_branch(user):
    if not user:
        user = frappe.session.user

    # Allow administrator to see all records
    if user == "Administrator":
        return ""

    # Fetch branch based on user
    user_branch = frappe.db.get_value('Employee', {'user_id': user}, 'branch')

    conditions = []

    if user_branch:
        conditions.append(f"`tabCRM Lead`.custom_lead_owner_branch = '{user_branch}'")
    
    # Add condition for the owner
    conditions.append(f"`tabCRM Lead`.owner = '{user}'")

    return " or ".join(conditions) if conditions else ""
