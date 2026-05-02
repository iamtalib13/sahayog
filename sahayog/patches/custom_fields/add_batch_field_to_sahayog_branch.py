import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Sahayog Branch": [
            {
                "fieldname": "batch",
                "fieldtype": "Data",
                "label": "Batch",
                "insert_after": "sol_id",
            }
        ]
    }
    create_custom_fields(fields, update=True)
