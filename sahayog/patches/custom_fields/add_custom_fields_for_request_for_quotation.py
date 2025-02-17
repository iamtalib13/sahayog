import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Request for Quotation": [
          {
                "fieldname": "custom_project",
                "fieldtype": "Link",
                "insert_after": "billing_address",
                "reqd": 1,
                "label": "Project",
                "options":"Project",
               
            },
        ]
    }

    create_custom_fields(fields, update=True)
