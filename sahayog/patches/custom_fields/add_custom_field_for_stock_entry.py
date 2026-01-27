import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Stock Entry": [
            {
                "fieldname": "employee_material_request",
                "fieldtype": "Link",
                "options": "Employee Material Request",
                "insert_after": "company",
                "label": "Employee Material Request",
            },      
        ],
    }
    create_custom_fields(fields)