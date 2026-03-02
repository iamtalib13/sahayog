import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Employee": [
            # 1. First, create the Section Break
            {
                "fieldname": "business_performance_section",
                "fieldtype": "Section Break",
                "label": "Business Performance",
                "insert_after": "pip_status" # Places the new section right after the PIP status
            },
            # 2. Add Monthly Business under the new section
            {
                "fieldname": "monthly_business",
                "fieldtype": "Currency",
                "label": "Monthly Business",
                "insert_after": "business_performance_section"
            },
            # 3. Add Yearly Business right after Monthly Business
            {
                "fieldname": "yearly_business",
                "fieldtype": "Currency",
                "label": "Yearly Business",
                "insert_after": "monthly_business"
            }
        ]
    }

    create_custom_fields(fields, update=True)
