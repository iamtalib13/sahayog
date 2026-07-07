import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    fields = {
        "Employee": [
            {
                "fieldname": "custom_uhid_number",
                "fieldtype": "Data",
                "insert_after": "custom_aadhar_number",
                "label": "UHID Number",
                "reqd": 0,
            }
        ]
    }

    create_custom_fields(fields, update=True)
