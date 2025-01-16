import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "File": [
            {
                "fieldname": "custom_attach_child_docname",
                "fieldtype": "Data",
                "insert_after": "attached_to_name",
                "label": "Attach to Child Docname",
            },
             
            
        ],
    }
    create_custom_fields(fields)