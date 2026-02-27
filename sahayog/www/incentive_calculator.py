import frappe
import json

def get_context(context):
    if frappe.session.user == 'Guest':
        frappe.throw("Please login to access this page", frappe.PermissionError)
    return context

@frappe.whitelist()
def get_incentive_config():
    """Returns the dynamic configuration for the frontend"""
    config_doc = frappe.get_doc("Incentive Config")
    
    config = {
        "accounts": [],
        "designation_rules": []
    }

    # 1. Load dynamic account types and rates
    if config_doc.account_rates:
        for item in config_doc.account_rates:
            config["accounts"].append({
                "name": item.account_type,
                "rate": item.incentive_amount,
                "count": 0
            })
            
    # 2. Load dynamic designation groups & MAB rules from JSON
    if config_doc.designation_structure:
        try:
            config["designation_rules"] = json.loads(config_doc.designation_structure)
        except Exception:
            config["designation_rules"] = []

    return config
