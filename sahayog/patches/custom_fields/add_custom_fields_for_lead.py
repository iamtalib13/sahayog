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
                "ignore_user_permissions": 1,
            },
            {
                "label": "Employee Name",
                "fieldname": "custom_employee_name",
                "fieldtype": "Data",
                "insert_after": "custom_employee_id",
            },
            {
                "label": "Designation",
                "fieldname": "custom_designation",
                "fieldtype": "Link",
                "options": "Designation",
                "insert_after": "custom_employee_name",
            },
            {
                "label": "Branch",
                "fieldname": "custom_branch",
                "fieldtype": "Link",
                "options" : "Branch",
                "insert_after": "custom_designation",
                "ignore_user_permissions": 1,
            },
            {
                "label": "District",
                "fieldname": "custom_district",
                "fieldtype": "Data",
                "insert_after": "custom_branch",
            },
            {
                "label": "Region",
                "fieldname": "custom_region",
                "fieldtype": "Link",
                "options" : "Region",
                "insert_after": "custom_district",
                "ignore_user_permissions": 1,
            },
            {
                "label": "Zone",
                "fieldname": "custom_zone",
                "fieldtype": "Link",
                "options" : "Zone",
                "insert_after": "custom_region",
                "ignore_user_permissions": 1,
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
                
            },
            {
                "label": "Remark",
                "fieldname": "custom_remark_not_interested",
                "fieldtype": "Small Text",
                "insert_after": "status",
                "depends_on": "eval:doc.status == 'Not Interested'",
                "mandatory_depends_on": "eval:doc.status == 'Not Interested'",
            },
            {
                "label": "Is Operation Lead",
                "fieldname": "custom_is_operation_lead",
                "fieldtype": "Check",
                "default": 0,
                "insert_after": "custom_zone",
            },


            {
                "fieldtype": "Column Break",
                "fieldname": "custom_column_break_1",
                "insert_after": "custom_is_operation_lead",
            },
            {
                "label": "Sol ID",
                "fieldname": "sol_id",
                "fieldtype": "Link",
                "options": "Sahayog Branch",
                "insert_after": "custom_column_break_1",
            }
            

        ],
    }
    create_custom_fields(fields)