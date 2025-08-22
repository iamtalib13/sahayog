import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Project Template Task": [
            {
                "fieldname": "custom_default_assignee",
                "fieldtype": "Small Text",
                "insert_after": "subject",
                "label": "Default Assignee", 
                "in_list_view": 1,          
            },
        ],
    }
    create_custom_fields(fields)