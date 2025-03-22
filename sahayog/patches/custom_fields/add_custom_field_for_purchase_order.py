import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Purchase Order": [
                         
            {
                "fieldname": "custom_request_for",
                "fieldtype": "Select",
                "options": "\nBranch\nProject\nStore",
                "insert_after": "custom_grn_srn",
                "label": "Request For",
                "reqd": 1,
            },
                

            {
                "fieldname": "custom_branch",
                "fieldtype": "Link",
                "options": "Branch",
                "insert_after": "custom_request_for",
                "label": "Branch",
                "depends_on": "eval:doc.custom_request_for == 'Branch'",
                "mandatory_depends_on": "eval:doc.custom_request_for == 'Branch'",
            },
            {
                "fieldname": "custom_project",
                "fieldtype": "Link",
                "options": "Project",
                "insert_after": "custom_branch",
                "label": "Project",
                "depends_on": "eval:doc.custom_request_for == 'Project'",
                "mandatory_depends_on": "eval:doc.custom_request_for == 'Project'",
            },
            {
                "fieldname": "custom_grn_srn",
                "fieldtype": "Select",
                "options": "\nGoods Receipt Note\nService Receipt Note",
                "insert_after": "supplier",
                "label": "GRN / SRN ?",
                "reqd": 1,
            },
            
                 
        ],
    }
    create_custom_fields(fields)