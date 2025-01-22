import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Task": [
            {
                "fieldname": "custom_location_details_section",
                "fieldtype": "Section Break",
                "insert_after": "sb_details",
                "label": "Location Details",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Task 1: Acquisition of Property'",
               
            },
            {
                "fieldname": "custom_location_details_html",
                "fieldtype": "HTML",
                "insert_after": "custom_location_details_section",
                "label": "Location Details",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Task 1: Acquisition of Property'",
               
            },
            {
                "fieldname": "custom_location_details",
                "fieldtype": "Table",
                "insert_after": "custom_location_details_html",
                "label": "Location",
                "options": "Location Details",  # Child table doctype
                "depends_on": "eval:!doc.is_template && doc.subject == 'Task 1: Acquisition of Property'",
            },
        ],
    }
    create_custom_fields(fields)
