import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    fields = [
        {
            "fieldname": "windows_key",
            "label": "Windows Key",
            "fieldtype": "Data",
            "insert_after": "asset_category"
        },
        {
            "fieldname": "office_key",
            "label": "Office Key",
            "fieldtype": "Data",
            "insert_after": "windows_key"
        }
    ]

    for df in fields:
        # Avoid duplicate creation
        if not frappe.db.exists("Custom Field", {"dt": "Asset", "fieldname": df["fieldname"]}):
            create_custom_field("Asset", df, ignore_validate=True)
