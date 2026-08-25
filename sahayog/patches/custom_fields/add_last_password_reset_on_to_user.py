import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "User": [
            {
                "fieldname": "last_password_reset_on",
                "fieldtype": "Date",
                "insert_after": "last_password_reset_date",
                "label": "Last Password Reset On",
                "read_only": 1,
                "description": "Date when the user last reset their password as per Sahayog Password Security Policy."
            }
        ]
    }
    create_custom_fields(fields, update=True)
