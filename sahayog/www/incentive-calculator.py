import frappe
import json

# def get_context(context):
#     # This ensures Frappe JS is loaded
#     context.no_cache = 1
    
#     # Check if user is logged in
#     if frappe.session.user == 'Guest':
#         frappe.throw("Please login to access this page", frappe.PermissionError)
    
#     return context


def get_context(context):
    # 1. Security Check
    if frappe.session.user == 'Guest':
        frappe.throw("Please login", frappe.PermissionError)

    # 2. Fetch Dynamic Config from DocType
    config = frappe.get_doc("Incentive Config")

    # 3. Transform for Frontend
    # Convert Child Table to simple Dictionary: {'Silver': 75, 'Gold': 100}
    rates = { item.account_type: item.incentive_amount for item in config.account_rates }
    
    # Convert MAB Slabs to list of dicts
    mab_slabs = [
        {"min": item.min_balance, "max": item.max_balance, "amount": item.incentive_amount}
        for item in config.mab_slabs
    ]

    # 4. Pass to Context (available as 'incentive_data' in HTML)
    context.incentive_data = {
        "rates": rates,
        "mab_slabs": mab_slabs
    }

    context.dynamic_config = json.dumps(dynamic_config)
    return context
