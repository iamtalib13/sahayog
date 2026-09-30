import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    fields = {
        "Employee": [
            {
                "fieldname": "sub_department",
                "fieldtype": "Data",
                "label": "Sub Department",
                "insert_after": "department",
                "reqd": 0,
            }
        ]
    }

    create_custom_fields(fields, update=True)
    frappe.db.commit()
