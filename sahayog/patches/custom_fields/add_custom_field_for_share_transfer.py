import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Share Transfer": [
            {
                "fieldname": "sol_id",
                "fieldtype": "Data",
                "insert_after": "transfer_type",
                "label": "SOL ID",
            },
            { 
                "fieldname": "account_number",
                "fieldtype": "Data",
                "insert_after": "sol_id",
                "label": "Account Number",
            },
            {
                "fieldname": "download_counter",
                "fieldtype": "Int",
                "default": "0",
                "insert_after": "date",
                "label": "Download Counter",
                "read_only": 1,
                "allow_on_submit":1,
            },
            {
                "fieldname": "downloaded_by",
                "fieldtype": "Text",
                "insert_after": "download_counter",
                "label": "Downloaded By<br>User - Download Time - Certificate Type",
                "read_only": 1,
                "allow_on_submit":1,
            },
        ]
    }

    create_custom_fields(fields, update=True)
