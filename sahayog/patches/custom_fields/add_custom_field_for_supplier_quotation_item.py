import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Supplier Quotation Item": [
            {
                "fieldname": "last_purchase_price",
                "fieldtype": "Currency",
                "insert_after": "rate",  # Place after the Rate field
                "label": "Last Purchase Price",
                "read_only": 1,  # Make it read-only
                "in_list_view": 1,  # Show in List View
                "columns": 1,  # Adjust column width (1-3)
            },
        ],
    }
    create_custom_fields(fields, update=True)  # Ensure it updates existing fields if needed
