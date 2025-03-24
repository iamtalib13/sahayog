import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Terms and Conditions": [
            {
                "fieldname": "custom_column_break",
                "fieldtype": "Column Break",
                "insert_after": "disabled",  # Placed after the "disabled" field
            },
            {
                "fieldname": "custom_sequence",
                "fieldtype": "Int",
                "insert_after": "custom_column_break",
                "label": "Sequence",
                "unique": 1,
                "read_only": 1,
            }
        ]
    }
    
    create_custom_fields(fields)
