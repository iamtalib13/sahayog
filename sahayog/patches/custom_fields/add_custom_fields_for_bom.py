import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "BOM": [
            {
                "fieldname": "supplier",
                "fieldtype": "Link",
                "options": "Supplier",
                "insert_after": "item",
                "label": "Supplier",
                "reqd": 1,
                
            },  

       
        ],
    }
    create_custom_fields(fields)