import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    # 1. Create child DocType for Configuration Table if it doesn't exist
    if not frappe.db.exists("DocType", "Sahayog Serial Configuration"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Sahayog Serial Configuration",
            "module": "Sahayog",
            "custom": 1,
            "istable": 1,
            "fields": [
                {
                    "fieldname": "config_type",
                    "fieldtype": "Select",
                    "label": "Type",
                    "options": "\nMAC Address\nModel Number\nOffice Key\nWindows Key\nOperating System\nProcessor\nRAM\nSerial Number\nStorage\nVendor\nWarranty start date\nWarranty end date\nMake",
                    "in_list_view": 1
                },
                {
                    "fieldname": "config_value",
                    "fieldtype": "Data",
                    "label": "Value",
                    "in_list_view": 1
                }
            ]
        })
        doc.insert()

    # 2. Add Custom Field to Serial No
    fields = {
        "Serial No": [
            {
                "fieldname": "asset_configuration_section",
                "fieldtype": "Section Break",
                "insert_after": "item_code",
                "label": "Asset Configuration Details",
                "collapsible": 1,
                "default_collapsed": 0
            },
            {
                "fieldname": "configuration_table",
                "fieldtype": "Table",
                "label": "Configuration Table",
                "options": "Sahayog Serial Configuration",
                "insert_after": "asset_configuration_section"
            }
        ]
    }
    create_custom_fields(fields)
