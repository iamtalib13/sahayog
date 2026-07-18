import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field


def execute():
    if not frappe.db.exists(
        "Custom Field", {"dt": "Asset", "fieldname": "varient"}
    ):
        create_custom_field(
            "Asset",
            {
                "fieldname": "varient",
                "label": "Varient",
                "fieldtype": "Data",
                "insert_after": "item_code",
            },
        )
