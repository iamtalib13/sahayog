import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Branch": [
            {
                "fieldname": "custom_warehouse",
                "fieldtype": "Link",
                "options": "Warehouse",
                "insert_after": "branch",
                "label": "Warehouse",
            },  
            
        ],
    }
    create_custom_fields(fields)