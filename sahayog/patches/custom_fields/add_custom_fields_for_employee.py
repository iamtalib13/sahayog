import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Employee": [
          {
                "fieldname": "custom_zone",
                "fieldtype": "Link",
                "insert_after": "grade",
                "reqd": 1,
                "label": "Zone",
                "options":"Zone",
               
            },



            {
                "fieldname": "custom_region",
                "fieldtype": "Link",
                "insert_after": "custom_zone",
                "reqd": 1,
                "label": "Region",
                "options":"Region",
            },
             {
                "fieldname": "custom_district",
                "fieldtype": "Data",
                "insert_after": "custom_region",
                "reqd": 1,
                "label": "District",
            },
           
    
            
            {
                "fieldname": "custom_division",
                "fieldtype": "Link",
                "insert_after": "custom_district",
                "reqd": 1,
                "label": "Division",
                "options":"Division",
            },

            {
                "fieldname": "custom_skip_auto_creation",
                "fieldtype": "Check",
                "insert_after": "erpnext_user",
                "label": "Skip Auto Creation",
            },
          
        ]
    }

    create_custom_fields(fields, update=True)
