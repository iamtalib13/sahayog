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
            
             {
                "fieldname": "sol_id",
                "fieldtype": "Data",
                "insert_after": "custom_warehouse",
                "label": "Branch SOL ID",
            },  
            
        ],
    }
    create_custom_fields(fields)