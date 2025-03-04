from frappe import _

def get_data():
    return {
        "fieldname": "employee_material_request",  # Default fieldname for external links
        "non_standard_fieldnames": {
            "Stock Entry": "custom_employee_material_request",  # Linking Stock Entry using 'custom_asset_request' field
        },
        "transactions": [
            {"items": ["Stock Entry"]},  # Linking Stock Entry with Asset Requests
        ],
    }
