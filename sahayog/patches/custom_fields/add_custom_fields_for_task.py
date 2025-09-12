import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Task": [
            {
                "fieldname": "custom_location_details_section",
                "fieldtype": "Section Break",
                "insert_after": "sb_details",
                "label": "Location Comparision Details",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Acquisition of the Property'",
               
            },
            {
                "fieldname": "custom_location_details_html",
                "fieldtype": "HTML",
                "insert_after": "custom_location_details_section",
                "label": "Location Details",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Acquisition of the Property'",
               
            },
            {
                "fieldname": "custom_location_details",
                "fieldtype": "Table",
                "insert_after": "custom_location_details_html",
                "label": "Location",
                "options": "Location Details",  # Child table doctype
                "depends_on": "eval:!doc.is_template && doc.subject == 'Acquisition of the Property'",
            },
            {
                "fieldname": "custom_agreement_details_section",
                "fieldtype": "Section Break",
                "insert_after": "sb_details",
                "label": "Agreement Details",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Agreement and Handover'",
            },
            {
                "fieldname": "custom_agreement",
                "fieldtype": "Attach",
                "insert_after": "custom_agreement_details_section",
                "label": "Agreement Attatchment",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Agreement and Handover'",
               
            },
             {
                "fieldname": "custom_infrastructure_section",
                "fieldtype": "Section Break",
                "insert_after": "sb_details",
                "label": "Infrastructure Tasks Details",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Infrastructure Development Work'",
               
            },
            {
              "fieldname": "infra_checklist_fetched",
              "fieldtype": "Check",
              "insert_after": "custom_infrastructure_section",
              "label": "Infra Checklist Fetched ?",
              "default": 0,
              "depends_on": "eval:frappe.user.has_role('System Manager') && !doc.is_template && doc.subject == 'Infrastructure Development Work'"
            },
            {
                "fieldname": "infrastructure_development_table",
                "fieldtype": "Table",
                "options": "Infrastructure Development Setting Table",
                "insert_after": "infra_checklist_fetched",
                "label": "Infrastructure Task Table",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Infrastructure Development Work'",
            },
               {
                "fieldname": "custom_sequence",
                "fieldtype": "Int",
                "insert_after": "subject",
                "label": "Sequence",
                "depends_on": "eval:doc.is_template == 1",               
            },

            {
                "fieldname": "custom_manpower_section",
                "fieldtype": "Section Break",
                "insert_after": "sb_details",
                "label": "Manpower Recruitment",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Manpower Recruitment'",
            },
             {
              "fieldname": "manpower_fetched",
              "fieldtype": "Check",
              "insert_after": "custom_manpower_section",
              "label": "Manpower Fetched ?",
              "default": 0,
              "depends_on": "eval:frappe.user.has_role('System Manager') && !doc.is_template && doc.subject == 'Manpower Recruitment'"
            },
            {
                "fieldname": "manpower_summary_html",
                "fieldtype": "HTML",
                "insert_after": "manpower_fetched",
                "label": "Manpower Summary",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Manpower Recruitment'"
            },
            {
                "fieldname": "manpower_recruitment_table",
                "fieldtype": "Table",
                "insert_after": "manpower_summary_html",
                "label": "Standard Hirable Manpower Table",
                "options": "Manpower Recruitment Hiring Table",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Manpower Recruitment'",
            },
            {
                "fieldname": "custom_licence_to_operate_section",
                "fieldtype": "Section Break",
                "insert_after": "sb_details",
                "label": "Licence to Operate Training",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Licence to Operate'",
            },
            {
                "fieldname": "lto_training_table",
                "fieldtype": "Table",
                "insert_after": "custom_licence_to_operate_section",
                "label": "Standard Training Checklist",
                "options": "Licence to Operate Training Table",
                "depends_on": "eval:!doc.is_template && doc.subject == 'Licence to Operate'",
            },
            {
              "fieldname": "custom_it_checklist_section",
              "fieldtype": "Section Break",
              "insert_after": "sb_details",
              "label": "IT Checklist",
              "depends_on": "eval:!doc.is_template && (doc.subject == 'IT Hardware Installation' || doc.subject == 'IT Software Installation')"
            },
            {
              "fieldname": "if_checklist_fetched",
              "fieldtype": "Check",
              "insert_after": "custom_it_checklist_section",
              "label": "IT Checklist Fetched?",
              "default": 0,
              "depends_on": "eval:frappe.user.has_role('System Manager') && !doc.is_template && (doc.subject == 'IT Hardware Installation' || doc.subject == 'IT Software Installation')"
            },
            {
              "fieldname": "it_checklist_table",
              "fieldtype": "Table",
              "insert_after": "if_checklist_fetched",
              "label": "IT Checklist Table",
              "options": "IT Checklist",
              "depends_on": "eval:!doc.is_template && (doc.subject == 'IT Hardware Installation' || doc.subject == 'IT Software Installation')"
            },
              {
                "fieldname": "column_break_after_is_template",
                "fieldtype": "Column Break",
                "insert_after": "is_template",
            },
            {
                "fieldname": "project_name",
                "fieldtype": "Data",
                "insert_after": "column_break_after_is_template",
                "label": "Project Name",
                "fetch_from": "project.project_name"
            },
        ],
    }
    create_custom_fields(fields)
