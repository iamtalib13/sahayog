import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Employee Group": [
            {
                "fieldname": "group_email",
                "fieldtype": "Data",
                "label": "Group Email",
                "insert_after": "employee_group_name",
                "options": "Email"
            }
        ]
    }
    create_custom_fields(fields, update=True)
