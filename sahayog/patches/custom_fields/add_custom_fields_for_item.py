import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Item": [
            {
                "fieldname": "custom_item_department",
                "fieldtype": "Link",
                "options": "Item Department",
                "insert_after": "item_name",
                "label": "Item Department",
                "reqd": 1,
            },
              {
                "fieldname": "bom_template",
                "fieldtype": "Check",
                "insert_after": "disabled",
                "label": "BOM Template",
                "default": 0,
            },
         
        ]
    }

    create_custom_fields(fields, update=True)
