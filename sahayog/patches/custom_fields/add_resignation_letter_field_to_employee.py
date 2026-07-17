import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    fields = {
        "Employee": [
            {
                "fieldname": "custom_resignation_letter",
                "fieldtype": "Attach",
                "insert_after": "custom_is_support_staff",
                "label": "Resignation Letter",
            },
        ]
    }

    create_custom_fields(fields, update=True)
