import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    if frappe.db.exists("Custom Field", {"dt": "Employee", "fieldname": "custom_aadhar_number"}):
        return

    fields = {
        "Employee": [
            {
                "fieldname": "custom_aadhar_number",
                "label": "Aadhar Number",
                "fieldtype": "Data",
                "insert_after": "custom_pan_number",
                "reqd": 0,
            }
        ]
    }

    create_custom_fields(fields, update=True)
    frappe.db.commit()
