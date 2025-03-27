import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Purchase Order": [
           
            {
                "fieldname": "custom_po_wo",
                "fieldtype": "Select",
                "options": "\nPurchase Order\nWork Order",
                "insert_after": "supplier",
                "label": "Type",
                "description": "Select the type of the document",
                "reqd": 1,
            },
             
            # {
            #     "fieldname": "custom_request_for",
            #     "fieldtype": "Select",
            #     "options": "\nBranch\nProject\nStore",
            #     "insert_after": "custom_section_request_details",
            #     "label": "Request For",
            #     "reqd": 1,
            # },

            # {
            #     "fieldname": "custom_branch",
            #     "fieldtype": "Link",
            #     "options": "Branch",
            #     "insert_after": "custom_request_for",
            #     "label": "Branch",
            #     "depends_on": "eval:doc.custom_request_for == 'Branch'",
            #     "mandatory_depends_on": "eval:doc.custom_request_for == 'Branch'",
            # },
            # {
            #     "fieldname": "custom_project",
            #     "fieldtype": "Link",
            #     "options": "Project",
            #     "insert_after": "custom_branch",
            #     "label": "Project",
            #     "depends_on": "eval:doc.custom_request_for == 'Project'",
            #     "mandatory_depends_on": "eval:doc.custom_request_for == 'Project'",
            # },
            {
                "fieldname": "custom_section_subject_and_remarks",
                "fieldtype": "Section Break",
                "insert_after": "amended_from",
                "label": "Subject and Remarks",
            },
            {
                "fieldname": "custom_subject",
                "fieldtype": "Small Text",
                "insert_after": "custom_section_subject_and_remarks",
                "label": "Subject",
                "reqd": 1,
            },
            {

                "fieldname": "custom_remarks",
                "fieldtype": "Text Editor",
                "insert_after": "custom_subject",
                "label": "Remarks",
                "reqd": 1,
            },

            

            {
                "fieldname": "custom_request_for",
                "fieldtype": "Select",
                "options": "\nBranch\nProject\nStore",
                "insert_after": "custom_remarks",
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
                "fieldname": "custom_terms_table",
                "fieldtype": "Table",
                "options": "Custom Terms and Conditions",  # Link to your child table
                "insert_after": "terms",  # Adjust based on where you want it
                "label": "Terms and Conditions",
            },

            {
                "fieldname": "custom_sahayog_status",
                "fieldtype": "Select",
                "options": "\nDraft\nPending From Purchase Manager\nPending From CFO\nApproved",
                "insert_after": "is_subcontracted",
                "label": "Sahayog Status",
                "no_copy": 1,
                "read_only": 1,
            
            }
                 

        ],
    }
    create_custom_fields(fields)