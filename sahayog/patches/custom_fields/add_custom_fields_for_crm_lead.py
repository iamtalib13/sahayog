import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "CRM Lead": [
            {
                "label": "Sahayog Details",
                "fieldname": "custom_sahayog_tab_break",
                "fieldtype": "Tab Break",
                "insert_after": "status_change_log",
               
            },
            

            {
                "label": "Lead Owner Branch",
                "fieldname": "custom_lead_owner_branch",
                "fieldtype": "Link",
                "insert_after": "custom_sahayog_tab_break",
                "options": "Branch",
                "ignore_user_permissions": True,
        
            },
           

             {
                "label": "Escalation Matrix",
                "fieldname": "custom_escalation_matrix",
                "fieldtype": "Table",
                "insert_after": "custom_lead_owner_branch",
                "options": "Escalation Matrix",
                
             },
             {
                "label": "Escalated To",
                "fieldname": "custom_escalated_to",
                "fieldtype": "Data",
                "insert_after": "custom_escalation_matrix",
                "ignore_user_permissions": True,

             },
             {
                "label": "Escalated To User",
                "fieldname": "custom_escalated_to_user",
                "fieldtype": "Data",
                "insert_after": "custom_escalated_to",
                "ignore_user_permissions": True,
             },

                { 
                "label": "Customer Type",
                "fieldname": "custom_customer_type",
                "fieldtype": "Select",  
                "insert_after": "custom_escalated_to_user",
                "options": "\nIndividual\nCorporate",

                },

                {
                    "label": "Zone",
                    "fieldname": "custom_zone",
                    "fieldtype": "Link",
                    "insert_after": "custom_customer_type",
                    "options": "Zone",
                },


                {
                    "label": "Region",
                    "fieldname": "custom_region",
                    "fieldtype": "Link",
                    "insert_after": "custom_zone",
                    "options": "Region",
                }, 

               
               {
                   "label": "Product",
                    "fieldname": "custom_product",
                    "fieldtype": "Table",
                    "insert_after": "custom_region",
                    "options": "Lead Product",
                        
               }
        ],
    }
    create_custom_fields(fields)