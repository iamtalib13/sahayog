import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Shareholder": [
            {
                "fieldname": "account_no",
                "fieldtype": "Data",
                "insert_after": "title",
                "label": "Account No",
            },
              {
                "fieldname": "get_data",
                "fieldtype": "Button",
                "insert_after": "account_no",
                "label": "Get Data",
            },
            {
                "fieldname": "cif",
                "fieldtype": "Data",
                "insert_after": "get_data",
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

         
        ]
    }

    create_custom_fields(fields, update=True)
