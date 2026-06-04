import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # 1. Relabel Purchase Date to Invoice Date
    if not frappe.db.exists("Property Setter", {"doc_type": "Asset", "field_name": "purchase_date", "property": "label"}):
        frappe.make_property_setter({
            "doctype": "Asset",
            "fieldname": "purchase_date",
            "property": "label",
            "value": "Invoice Date",
            "property_type": "Data"
        })

    # 2. Add Description field
    if not frappe.db.exists("Custom Field", {"dt": "Asset", "fieldname": "custom_description"}):
        create_custom_field("Asset", {
            "fieldname": "custom_description",
            "label": "Description",
            "fieldtype": "Small Text",
            "insert_after": "asset_configuration"
        })
