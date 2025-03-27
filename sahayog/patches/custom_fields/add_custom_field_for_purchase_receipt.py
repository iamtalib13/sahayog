import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Purchase Receipt": [
           {
                "fieldname": "custom_po_wo",
                "fieldtype": "Select",
                "options": "\nPurchase Order\nWork Order",
                "insert_after": "supplier",
                "label": "Type",
                "description": "Select the type of the document",
                "reqd": 1,
            },
            {
                "fieldname": "custom_request_for",
                "fieldtype": "Select",
                "options": "\nBranch\nProject\nStore",
                "insert_after": "dimension_col_break",
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
                "fieldname": "custom_sahayog_status",
                "fieldtype": "Select",
                "options": "\nPending\nReceived",
                "insert_after": "return_against",
                "label": "Sahayog Status",
                "no_copy": 1,
                "read_only": 1,
            }
        ],
    }
    create_custom_fields(fields)
