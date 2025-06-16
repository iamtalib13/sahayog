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
                "fieldtype": "Link",
                "options" : "Branch",
                "insert_after": "custom_employee_id",
            },

            {
                "label": "Region",
                "fieldname": "custom_region",
                "fieldtype": "Link",
                "options" : "Region",
                "insert_after": "custom_branch", 
            },
            {
                "label": "Zone",
                "fieldname": "custom_zone",
                "fieldtype": "Link",
                "options" : "Zone",
                "insert_after": "custom_region",
            },
            {
                "label": "Lead Appointment",
                "fieldname": "custom_lead_appointment_tab",
                "fieldtype": "Tab Break",
                "insert_after": "blog_subscriber",
            },
            {
                "label": "Lead Appointments",
                "fieldname": "custom_lead_appointments",
                "fieldtype": "Table",
                "options": "Lead Appointment",
                "insert_after": "custom_lead_appointment_tab",
                "read_only": 1,
            }, 

            {
                "label": "Product Details",
                "fieldname":"custom_product_details_section",
                "fieldtype" : "Section Break",
                "insert_after": "phone_ext",
                
            },
            {
                "label": "Product",
                "fieldname": "custom_product_table",
                "fieldtype": "Table",
                "options": "Lead Product",
                "insert_after": "custom_product_details_section",
                
            }
        ],
    }
    create_custom_fields(fields)