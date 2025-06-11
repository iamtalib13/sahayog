import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Lead": [
            
            {
                "label": "Employee Details",
                "fieldname": "custom_lead_owner_details_section",
                "fieldtype": "Section Break",
                "insert_after": "contact_html",
                "collapsible": 1,
            },
            {
                "label":"Employee ID",
                "fieldname": "custom_employee_id",
                "fieldtype": "Link",
                "options": "Employee",
                "insert_after": "custom_lead_owner_details_section",
            },
            {
                "label": "Branch",
                "fieldname": "custom_branch",
                "fieldtype": "Data",
                "insert_after": "custom_employee_id",
            },

            {
                "label": "Region",
                "fieldname": "custom_region",
                "fieldtype": "Data",
                "insert_after": "custom_branch", 
            },
            {
                "label": "Zone",
                "fieldname": "custom_zone",
                "fieldtype": "Data",
                "insert_after": "custom_region",
            },
           
            
        ],
    }
    create_custom_fields(fields)