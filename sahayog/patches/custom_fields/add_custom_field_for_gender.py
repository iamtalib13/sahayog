import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Gender": [
            {
                "fieldname": "custom_enabled",
                "fieldtype": "Check",
                "insert_after": "gender",
                "label": "Enabled",
                "default": 1,

            },  
            
        ],
    }
    create_custom_fields(fields)