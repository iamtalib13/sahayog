import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Designation": [
           
          
            {
                "fieldname": "custom_ta_category",
                "fieldtype": "Select",
                "insert_after": "description",
                "label": "Travel Allowance Category",
                "options": "\n".join([
                    " ",
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",

                ])  
            },
             
            
        ],
    }

    create_custom_fields(fields, update=True)