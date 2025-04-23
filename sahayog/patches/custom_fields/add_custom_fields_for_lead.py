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
                "label": "Product",
                "fieldname": "custom_product",
                "fieldtype": "Link",
                "insert_after": "custom_sahayog_tab_break",
                "reqd": 1,
                "options": "Product",
                "ignore_user_permissions": True,
               
            },

            {
                "label": "Product Name",
                "fieldname": "custom_product_name",
                "fieldtype": "Data",
                "insert_after": "custom_product",
                "fetch_from": "custom_product.product_name",
               
            },

            {
                "label": "Lead Owner Branch",
                "fieldname": "custom_lead_owner_branch",
                "fieldtype": "Link",
                "insert_after": "custom_product_name",
                "options": "Branch",
                "ignore_user_permissions": True,
        
            }
             
            
        ],
    }
    create_custom_fields(fields)