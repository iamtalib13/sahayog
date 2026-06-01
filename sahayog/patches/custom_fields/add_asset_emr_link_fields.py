import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Add link to EMR in Asset doctype
    asset_field = {
        "fieldname": "custom_emr",
        "label": "Employee Material Request",
        "fieldtype": "Link",
        "options": "Employee Material Request",
        "insert_after": "item_code"
    }

    if not frappe.db.exists("Custom Field", {"dt": "Asset", "fieldname": "custom_emr"}):
        create_custom_field("Asset", asset_field)

    # Add link to Asset in Employee Material Request doctype
    emr_field = {
        "fieldname": "custom_asset",
        "label": "Asset",
        "fieldtype": "Link",
        "options": "Asset",
        "insert_after": "status"
    }

    if not frappe.db.exists("Custom Field", {"dt": "Employee Material Request", "fieldname": "custom_asset"}):
        create_custom_field("Employee Material Request", emr_field)
