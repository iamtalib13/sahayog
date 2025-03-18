import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Warehouse": [
            {
                "fieldname": "custom_warehouse_category",
                "fieldtype": "Select",
                "options": "\nBranch\nProject\nStore",
                "insert_after": "parent_warehouse",
                "label": "Warehouse Category",
                "reqd": 1,  
            }
        ],
    }
    create_custom_fields(fields)