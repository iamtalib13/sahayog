import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Material Request": [
            {
                "fieldname": "custom_employee",
                "fieldtype": "Link",
                "options": "Employee",
                "insert_after": "material_request_type",
                "label": "Employee",
            },  
            
            {
                "fieldname": "custom_project",
                "fieldtype": "Link",
                "options": "Project",
                "insert_after": "schedule_date",
                "label": "Project",
            },      
        ],
    }
    create_custom_fields(fields)