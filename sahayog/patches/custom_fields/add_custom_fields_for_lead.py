import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Lead": [
            {
                "label": "Full Name",
                "fieldname": "custom_full_name",
                "fieldtype": "Data",
                "insert_after": "salutation",
                "reqd": 1,
            },
            
        ],
    }
    create_custom_fields(fields)