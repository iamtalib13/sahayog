import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Stock Entry": [
            {
                "fieldname": "custom_asset_request",
                "fieldtype": "Link",
                "options": "Asset Request",
                "insert_after": "inspection_required",
                "label": "Asset Request",
            },      
        ],
    }
    create_custom_fields(fields)