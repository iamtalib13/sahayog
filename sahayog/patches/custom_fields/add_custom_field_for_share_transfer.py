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
            

         
        ]
    }

    create_custom_fields(fields, update=True)
