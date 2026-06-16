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
                "fieldname": "cxo_level",
                "fieldtype": "Check",
                "insert_after": "employee_number",
                "label": "CXO Level",
                "default": 0
            },

            {
                "fieldname": "custom_skip_auto_creation",
                "fieldtype": "Check",
                "insert_after": "erpnext_user",
                "label": "Skip Auto Creation",
            },
             
            {
                "fieldname": "custom_cluter",
                "fieldtype": "Link",
                "options": "Cluster Mapping",
                "insert_after": "custom_division",
                "label": "Cluster"
            },
                {
                "fieldname": "sol_id",
                "fieldtype": "Data",
                "fetch_from": "branch.sol_id",
                "insert_after": "branch",
                "label": "Sol ID"
            },
               {
                "fieldname": "sahayog_branch",
                "fieldtype": "Link",
                "options": "Sahayog Branch",
                "insert_after": "reports_to",
                "label": "Sahayog Branch"
            },
            {
                "fieldname": "pip_status",
                "fieldtype": "Check",
                "insert_after": "status",
                "label": "PIP Status",
                "default": 0
            
            },
            {
                "fieldname": "custom_is_support_staff",
                "fieldtype": "Check",
                "insert_after": "pip_status",
                "label": "Is Support Staff",
                "default": 0
            },
        ]
    }

    create_custom_fields(fields, update=True)
