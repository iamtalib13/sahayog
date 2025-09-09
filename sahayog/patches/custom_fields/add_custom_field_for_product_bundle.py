import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Product Bundle Item": [
            {
                "fieldname": "item_group",
                "fieldtype": "Link",
                "options": "Item Group",
                "insert_after": "item_code",
                "label": "Item Group",
                "depends_on": "eval:doc.item_code",
                "in_list_view": 1,
                "columns":1,
               
            },
             {
                "fieldname": "custom_rate",
                "fieldtype": "Currency",
                "insert_after": "uom",
                "label": "Rate",
                "depends_on": "eval:doc.item_code",      
                "in_list_view": 1,  
                "columns":1,      
            },
           
        ],
    }
    create_custom_fields(fields)
