import frappe
from sahayog.petty_cash_management.permissions import get_user_allowed_branches

def get_permission_query_conditions(user):
    """
    Returns a SQL WHERE clause condition to filter records.
    """
    if not user: user = frappe.session.user

    allowed_branches = get_user_allowed_branches(user)

    # If Admin/Manager (allowed_branches is None), return empty string (No filter)
    if allowed_branches is None:
        return ""

    # If User has no branch, block everything
    if not allowed_branches:
        return "1=0" # Impossible condition

    # Return SQL condition: `branch` IN ('1113', '1114')
    # We must format the list for SQL
    branches_str = "', '".join(allowed_branches)
    return f"`tabPetty Cash Transaction`.branch IN ('{branches_str}')"

def get_account_permission_query_conditions(user):
    """
    Same logic for Branch Petty Cash Account
    """
    if not user: user = frappe.session.user
    allowed_branches = get_user_allowed_branches(user)

    if allowed_branches is None: return ""
    if not allowed_branches: return "1=0"

    branches_str = "', '".join(allowed_branches)
    return f"`tabBranch Petty Cash Account`.branch IN ('{branches_str}')"
