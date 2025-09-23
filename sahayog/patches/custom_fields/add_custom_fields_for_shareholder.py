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
            },
     
            {
                "fieldname": "sol_id",
                "fieldtype": "Data",
                "insert_after": "cif",
                "label": "SOL ID",
            },
             {
                "fieldname": "sol_desc",
                "fieldtype": "Data",
                "insert_after": "sol_id",
                "label": "SOL Description",
            },
            {
                "fieldname": "customer_name",
                "fieldtype": "Data",
                "insert_after": "naming_series",
                "label": "Customer Name",
            },
               {
                "fieldname": "address",
                "fieldtype": "Small Text",
                "insert_after": "customer_name",
                "label": "Address",
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
