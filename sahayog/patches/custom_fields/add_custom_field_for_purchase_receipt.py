import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Purchase Receipt": [
            {
                "fieldname": "custom_grn_srn",
                "fieldtype": "Select",
                "options": "\nGoods Receipt Note\nService Receipt Note",
                "insert_after": "supplier",
                "label": "GRN - SRN",
                "reqd": 1,
            },
        ],
    }
    create_custom_fields(fields)
