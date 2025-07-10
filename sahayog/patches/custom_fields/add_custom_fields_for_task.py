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
                "depends_on": "eval:!doc.is_template && doc.subject == 'Task 1 : Acquisition of the Property'",
               
            },
            {
                "fieldname": "custom_location_details_html",
                "fieldtype": "HTML",
                "insert_after": "custom_location_details_section",
                "label": "Location Details",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Task 1 : Acquisition of the Property'",
               
            },
            {
                "fieldname": "custom_location_details",
                "fieldtype": "Table",
                "insert_after": "custom_location_details_html",
                "label": "Location",
                "options": "Location Details",  # Child table doctype
                "depends_on": "eval:!doc.is_template && doc.subject == 'Task 1 : Acquisition of the Property'",
            },
            {
                "fieldname": "custom_agreement_details_section",
                "fieldtype": "Section Break",
                "insert_after": "completed_on",
                "label": "Agreement Details",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Task 3: Agreement and Handover'",
            },
            {
                "fieldname": "custom_agreement",
                "fieldtype": "Attach",
                "insert_after": "custom_agreement_details_section",
                "label": "Agreement Attatchment",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Task 3: Agreement and Handover'",
               
            },
             {
                "fieldname": "custom_supplier_details_section",
                "fieldtype": "Section Break",
                "insert_after": "custom_agreement",
                "label": "Supplier Details",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Task 4: Vendor Allocation'",
               
            },
            {
                "fieldname": "custom_allow_supplier",
                "fieldtype": "Table",
                "options": "Allow Supplier",
                "insert_after": "custom_supplier_details_section",
                "label": "Allow Supplier",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Task 4: Vendor Allocation'",
               
            },
               {
                "fieldname": "custom_sequence",
                "fieldtype": "Int",
                "insert_after": "subject",
                "label": "Sequence",
               
            },
        ],
    }
    create_custom_fields(fields)
