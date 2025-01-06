import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Project": [
           
            {
                "fieldname": "custom_branch_details_section",
                "fieldtype": "Section Break",
                "insert_after": "department",
                "label": "Branch Details",
               
                
            },
            {
                "fieldname": "custom_branch_status",
                "fieldtype": "Select",
                "insert_after": "custom_branch_details_section",
                "label": "Branch Status",
                "reqd": 1,
                "options": "\n".join([
                    "Not Started",
                    "Under Development",
                    "Live"
                ])  
            },
              {
                "fieldname": "custom_branch_col_1",
                "fieldtype": "Column Break",
                "insert_after": "custom_branch_status",
                "label": "",
               
            },
             {
                "fieldname": "custom_zone",
                "fieldtype": "Link",
                "insert_after": "custom_branch_status",
                "label": "Zone",
                "options":"Zone",
                "reqd":1,
               
            },
            {
                "fieldname": "custom_branch_col_2",
                "fieldtype": "Column Break",
                "insert_after": "custom_zone",
                "label": "",
               
            },
             {
                "fieldname": "custom_region",
                "fieldtype": "Link",
                "insert_after": "custom_branch_col_2",
                "label": "Region",
                "options":"Region",
                "reqd":1,
               
            },
            
            
            
        ],
    }

    create_custom_fields(fields, update=True)