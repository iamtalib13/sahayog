from frappe import _

def get_data():
    return {
        "fieldname": "employee_material_request", 
        "non_standard_fieldnames": {
            "Stock Entry": "employee_material_request", 
        },
        "transactions": [
            {"items": ["Stock Entry"]},  
        ],
    }
