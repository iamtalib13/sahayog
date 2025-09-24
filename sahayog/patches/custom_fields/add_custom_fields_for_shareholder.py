import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Shareholder": [
            {
                "fieldname": "cif",
                "fieldtype": "Data",
                "insert_after": "title",
                "label": "CIF ID",
                "read_only": 1,
            },
     
            {
                "fieldname": "sol_id",
                "fieldtype": "Data",
                "insert_after": "cif",
                "label": "SOL ID",
                "read_only": 1,
            },
             {
                "fieldname": "sol_desc",
                "fieldtype": "Data",
                "insert_after": "sol_id",
                "label": "SOL Description",
                "read_only": 1,
            },
            {
                "fieldname": "customer_name",
                "fieldtype": "Data",
                "insert_after": "naming_series",
                "label": "Customer Name",
                "read_only": 1,
            },
               {
                "fieldname": "address",
                "fieldtype": "Small Text",
                "insert_after": "customer_name",
                "label": "Address",
                "read_only": 1,
            },
{
                "fieldname": "share_transaction_details",
                "fieldtype": "HTML",
                "insert_after": "section_break_3",
                "label": "Share Transaction Details",
                

            },

         
        ]
    }

    create_custom_fields(fields, update=True)
