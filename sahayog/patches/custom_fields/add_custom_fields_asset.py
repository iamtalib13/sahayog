import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():

    fields = [
        {
            "fieldname": "asset_configuration_section",
            "label": "Asset Configuration",
            "fieldtype": "Section Break",
            "insert_after": "department"
        },
        {
            "fieldname": "asset_configuration",
            "label": "Asset Configuration",
            "fieldtype": "Table",
            "options": "Asset Configuration",
            "insert_after": "asset_configuration_section"
        },
        {
            "fieldname": "custom_invoice_number",
            "label": "Invoice Number",
            "fieldtype": "Data",
            "insert_after": "purchase_invoice"
        }
    ]

    for df in fields:
        if not frappe.db.exists(
            "Custom Field",
            {
                "dt": "Asset",
                "fieldname": df["fieldname"]
            }
        ):
            create_custom_field(
                "Asset",
                df,
                ignore_validate=True
            )