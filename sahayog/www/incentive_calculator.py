import frappe
import json

def get_context(context):
    # Standard security check
    if frappe.session.user == 'Guest':
        frappe.throw("Please login to access this page", frappe.PermissionError)
    
    # We no longer inject dynamic_config here to avoid Jinja errors
    return context

@frappe.whitelist()
def get_incentive_config():
    """Returns the dynamic configuration for the frontend"""
    
    # 1. Fetch Dynamic Config from DocType
    config_doc = frappe.get_doc("Incentive Config")
    
    config = {
        "accounts": [],
        "mab_slabs": []
    }

    # Load Account Types
    if config_doc.account_rates:
        for item in config_doc.account_rates:
            config["accounts"].append({
                "name": item.account_type,
                "rate": item.incentive_amount,
                "count": 0
            })
            
    # Load MAB Slabs
    if config_doc.mab_slabs:
        for item in config_doc.mab_slabs:
            config["mab_slabs"].append({
                "min": item.min_balance,
                "max": item.max_balance,
                "amount": item.incentive_amount
            })

    # Sort MAB slabs
    config["mab_slabs"].sort(key=lambda x: x['min'])

    return config
