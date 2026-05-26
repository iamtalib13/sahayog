# import frappe
# from sahayog.petty_cash_management.permissions import get_user_allowed_branches

# def get_permission_query_conditions(user):
#     """
#     Returns a SQL WHERE clause condition to filter records.
#     """
#     if not user: user = frappe.session.user

#     allowed_branches = get_user_allowed_branches(user)

#     # If Admin/Manager (allowed_branches is None), return empty string (No filter)
#     if allowed_branches is None:
#         return ""

#     # If User has no branch, block everything
#     if not allowed_branches:
#         return "1=0" # Impossible condition

#     # Return SQL condition: `branch` IN ('1113', '1114')
#     # We must format the list for SQL
#     branches_str = "', '".join(allowed_branches)
#     return f"`tabPetty Cash Transaction`.branch IN ('{branches_str}')"

# def get_account_permission_query_conditions(user):
#     """
#     Same logic for Branch Petty Cash Account
#     """
#     if not user: user = frappe.session.user
#     allowed_branches = get_user_allowed_branches(user)

#     if allowed_branches is None: return ""
#     if not allowed_branches: return "1=0"

#     branches_str = "', '".join(allowed_branches)
#     return f"`tabBranch Petty Cash Account`.branch IN ('{branches_str}')"


import frappe


def get_transaction_query_conditions(user):
    """
    Registered in hooks.py. Filters Petty Cash Transactions so users only see their branch.
    Bypasses Redis cache by using a direct SQL subquery.
    """
    if not user:
        user = frappe.session.user

    # Admin and Managers see everything
    # if user == "Administrator" or "HO Petty Cash Manager" in frappe.get_roles(user):
    #     return None

    roles = frappe.get_roles(user)
    if 'System Manager' in roles or 'Administrator' in roles or any(r in roles for r in ["HO Petty Cash Manager", "HO Petty Cash Approver", "HO Petty Cash Verifier", "HO Petty Cash Auditor",]):
        return None

    # Dynamic Subquery - Database evaluates this live on every request
    escaped_user = frappe.db.escape(user)
    return f"`tabPetty Cash Transaction`.branch = (SELECT sahayog_branch FROM `tabEmployee` WHERE user_id = {escaped_user} AND status = 'Active' LIMIT 1)"


def has_transaction_permission(doc, ptype, user):
    """
    Registered in hooks.py. Prevents direct URL access to other branches.
    """
    if not user:
        user = frappe.session.user

    # if user == "Administrator" or "HO Petty Cash Manager" in frappe.get_roles(user):
    #     return True

    user_roles = frappe.get_roles(user)
    if user == 'Administrator' or any(r in user_roles for r in ["HO Petty Cash Manager", "HO Petty Cash Approver", "HO Petty Cash Verifier", "HO Petty Cash Auditor",]):
        return True

    # SQL bypasses frappe.db.get_value caching
    branch_data = frappe.db.sql(
        "SELECT sahayog_branch FROM `tabEmployee` WHERE user_id = %s AND status = 'Active' LIMIT 1",
        (user,)
    )

    if branch_data and branch_data[0][0]:
        live_branch = branch_data[0][0]
        if doc.branch == live_branch:
            return True

    return False
