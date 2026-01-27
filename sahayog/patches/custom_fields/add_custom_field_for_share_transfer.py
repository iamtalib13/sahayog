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
                "fieldname": "serial_number",
                "fieldtype": "Data",
                "insert_after": "account_number",
                "label": "Serial Number",
                "unique": "1",
                "allow_on_submit": "1",
            },
            {
                "fieldname": "enable_print",
                "fieldtype": "Check",
                "default": "1",
                "insert_after": "date",
                "label": "Enable Print",
                "read_only": 1,
                "allow_on_submit":1,
            },
      
            {
                "fieldname": "print_counter",
                "fieldtype": "Int",
                "default": "0",
                "insert_after": "date",
                "label": "Print Counter",
                "read_only": 1,
                "allow_on_submit":1,
            },
            
            {
                "fieldname": "print_type",
                "fieldtype": "Select",
                "default": "Original",
                "insert_after": "print_counter",
                "label": "Print Type",
                "options":"\nOriginal\nDuplicate",
                "read_only": 1,
                "allow_on_submit":1,
            },
            {
                "fieldname": "printed_by",
                "fieldtype": "Text",
                "insert_after": "print_type",
                "label": "Printed By<br>User - Download Time - Certificate Type",
                "read_only": 1,
                "allow_on_submit":1,
            },
        ]
    }

    create_custom_fields(fields, update=True)
