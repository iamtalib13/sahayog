import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Supplier Quotation Item": [
            {
                "fieldname": "last_purchase_price",
                "fieldtype": "Currency",
                "insert_after": "rate",  
                "label": "Last Purchase Price",
                "read_only": 1,  
                "in_list_view": 1,  
                "columns": 1,  
            },
            {
                "fieldname": "column_break_ssbh",
                "fieldtype": "Column Break",
                "insert_after": "base_amount",
                "label": "",
            },
            {
                "fieldname": "last_purchase_price_supplierwise",
                "fieldtype": "Select",
                "insert_after": "column_break_ssbh",  
                "label": "Last Purchase Price Supplier Wise",
            },
            {
                "fieldname": "proposed_price",
                "fieldtype": "Currency",
                "insert_after": "last_purchase_price_supplierwise",  
                "label": "Proposed Price to Supplier",
            },
            {
                "fieldname": "show_proposed_price",
                "fieldtype": "Check",
                "insert_after": "proposed_price",  
                "label": "Show Proposed Price?",
                "default": 0,  # Default value as unchecked
            },
        ],
    }
    create_custom_fields(fields, update=True)  
