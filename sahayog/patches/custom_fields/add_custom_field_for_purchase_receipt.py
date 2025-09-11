import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Purchase Receipt": [

        
        ],
    }
    create_custom_fields(fields)
