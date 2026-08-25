app_name = "sahayog"
app_title = "Sahayog"
app_publisher = "Developer Team"
app_description = "Sahayog Internal ERP"
app_email = "talibsheikh16@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "sahayog",
# 		"logo": "/assets/sahayog/logo.png",
# 		"title": "Sahayog",
# 		"route": "/sahayog",
# 		"has_permission": "sahayog.api.permission.has_app_permission"
# 	}
# ]
website_route_rules = [
    {"from_route": "/me", "to_route": "me"},
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/sahayog/css/sahayog.css"
# app_include_js = "/assets/sahayog/js/sahayog.js"

# include js, css files in header of web template
# web_include_css = "/assets/sahayog/css/sahayog.css"
# web_include_js = "/assets/sahayog/js/sahayog.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "sahayog/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    "Item": "public/js/item_custom.js",
    "Serial No": "public/js/serial_no_custom.js",
    "Purchase Order": "public/js/purchase_order.js",
    "Supplier Quotation": "public/js/supplier_quotation.js",
    "Request for Quotation": "public/js/request_for_quotation.js",
    "Material Request": "public/js/material_request.js",
    "Workspace": "public/js/workspace.js",
    "Task": "public/js/task.js",
    "Project": "public/js/project.js",
    "Lead": "scrm/controller/lead/lead.js",
    "Appointment": "scrm/controller/appointment/appointment.js",
    "Product Bundle": "public/js/product_bundle.js",
    "BOM": "public/js/bom.js",
    "Purchase Receipt": "public/js/purchase_receipt.js",
    "Stock Entry": "public/js/stock_entry.js",
    "Shareholder": "public/js/shareholder.js",
    "Share Transfer": "public/js/share_transfer.js",
    "Asset Movement": "public/js/asset_movement.js",
    "Asset": "public/js/asset_custom.js",
}
doctype_list_js = {
    "Purchase Receipt": "public/js/purchase_receipt_list.js",
    "Stock Entry": "public/js/stock_entry_list.js",
    "Material Request": "public/js/material_request_list.js",
    "Shareholder": "public/js/shareholder_list.js",
    "Share Transfer": "public/js/share_transfer_list.js",
    "Branch Petty Cash Account": "doctype/branch_petty_cash_account/branch_petty_cash_account_list.js",
    "Lead": "public/js/lead_list.js",
    "Asset": "public/js/asset_list.js",
}
# app_include_js = "/assets/frappe/js/frappe-web.min.js"
app_include_js = ["/assets/sahayog/js/assignmate.js",
                  "/assets/sahayog/js/petite-vue.iife.js",
                  "/assets/sahayog/js/dams_email.js",
                  "/assets/sahayog/js/active_users_badge.js"
                  ]


# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "sahayog/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#     "Supplier": "/supplier-portal"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "sahayog.utils.jinja_methods",
# 	"filters": "sahayog.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "sahayog.install.before_install"
# after_install = [
#    "sahayog.patches.custom_fields.add_custom_fields_for_project.execute",
# ]

after_migrate = [
    # "sahayog.patches.custom_fields.add_custom_field_for_share_transfer.execute",
    # "sahayog.patches.custom_fields.add_custom_fields_for_shareholder.execute",
    # "sahayog.patches.custom_fields.add_custom_fields_for_bom.execute",
    # "sahayog.patches.custom_fields.add_custom_fields_for_item.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_product_bundle.execute",
    # "sahayog.patches.custom_fields.add_custom_fields_for_project.execute",
    # "sahayog.patches.custom_fields.add_custom_fields_for_employee.execute",
    # "sahayog.patches.custom_fields.add_custom_fields_for_task.execute",
    # "sahayog.patches.custom_fields.add_custom_fields_for_request_for_quotation.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_supplier_quotation_item.execute",
    # "sahayog.patches.custom_fields.add_custom_fields_for_branch.execute",
    # "sahayog.patches.custom_fields.add_batch_field_to_sahayog_branch.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_stock_entry.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_material_request.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_warehouse.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_supplier_quotation.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_purchase_order.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_purchase_receipt.execute",
    # "sahayog.patches.custom_fields.add_custom_fields_for_lead.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_employee_group.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_project_template_task.execute",
    # "sahayog.patches.fixtures.add_region.execute",
    # "sahayog.patches.fixtures.add_division.execute",
    # "sahayog.patches.fixtures.add_zone.execute",
    # "sahayog.patches.fixtures.add_module_profile.execute",
    # "sahayog.patches.fixtures.add_role_profile.execute",
    # "sahayog.patches.fixtures.hr_setting.execute",
    # "sahayog.patches.fixtures.set_view_setting_of_project.execute",
    # "sahayog.patches.fixtures.add_role_and_role_profile_for_project_doctype.execute",
    # "sahayog.patches.fixtures.allow_login_using_user_name.execute",
    #    "sahayog.patches.fixtures.add_custom_html_for_assigned_task.execute",
    #    "sahayog.patches.fixtures.add_custom_html_for_employee_ess.execute",
    # "sahayog.patches.add_roles.execute",
    # "sahayog.patches.fixtures.add_item_group.execute",
    # "sahayog.patches.fixtures.add_warehouses.execute",
    # "sahayog.patches.fixtures.add_read_role_permission.execute",
    # "sahayog.patches.fixtures.add_role_profile_for_stock_user.execute",
    # "sahayog.patches.fixtures.set_project_template_mandatory.execute",
    # "sahayog.patches.fixtures.add_custom_workflow_state.execute",
    # "sahayog.patches.fixtures.add_custom_workflow_for_purchase_order.execute",
    # "sahayog.scrm.custom_html_block.l_zone_and_region_wise_data.execute",
    # "sahayog.scrm.custom_html_block.employee_crm.execute",
    # "sahayog.patches.custom_fields.add_custom_field_for_Material_Request_Item-custom_custom_metrial_transfre_purches_status.execute",
    # "sahayog.patches.fixtures.create_employee_material_request_workflow.execute",
    # "sahayog.patches.custom_fields.add_custom_field_stock_entry_employee_material_request.execute",
    # "sahayog.patches.custom_fields.add_custom_emr_asset_connection_fields.execute",
    # "sahayog.patches.custom_fields.add_custom_emr_stock_entry_connection_fields.execute",
    # "sahayog.patches.custom_fields.add_naming_controls_to_asset.execute",
    # "sahayog.patches.set_asset_status_options.execute",
    # "sahayog.patches.custom_fields.add_asset_emr_link_fields.execute",
    # "sahayog.patches.custom_fields.add_varient_field_to_asset.execute",
]
# Uninstallation
# ------------

# before_uninstall = "sahayog.uninstall.before_uninstall"
# after_uninstall = "sahayog.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "sahayog.utils.before_app_install"
# after_app_install = "sahayog.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "sahayog.utils.before_app_uninstall"
# after_app_uninstall = "sahayog.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "sahayog.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

permission_query_conditions = {
    # "Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
    "Lead": "sahayog.permissions.get_lead_permission",
    "Appointment": "sahayog.permissions.get_appointment_permission",
    "Task": "sahayog.permissions.get_task_permission",
    "Agent": "sahayog.agent_and_bdo.doctype.agent.permissions.get_agents_sol_wise",
    "Purchase Receipt": "sahayog.permissions.get_purchase_receipt_permission_for_warehouse",
    "Stock Entry": "sahayog.permissions.get_stock_entry_permission_for_warehouse",
    "Shareholder": "sahayog.permissions.get_shareholder_permission",
    "Share Transfer": "sahayog.permissions.get_share_transfer_permission",
    "Petty Cash Transaction": "sahayog.petty_cash_management.permission_queries.get_transaction_query_conditions",
    "Employee Material Request": "sahayog.permissions.get_employee_material_request_permission",
    "EOD Tasks": "sahayog.sahayog.doctype.eod_tasks.eod_tasks.get_permission_query_conditions",
    "Approval Request": "sahayog.sahayog.doctype.approval_request.approval_request.get_permission_query_conditions",
    "Item": "sahayog.permissions.get_item_permission",
    "Loan Application": "sahayog.permissions.get_loan_application_permission",
    "MAC Activity": "sahayog.scrm.doctype.mac_activity.mac_activity.get_permission_query_conditions",
}
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

has_permission = {
    "Lead": "sahayog.permissions.has_lead_permission",
    "Petty Cash Transaction": "sahayog.petty_cash_management.permission_queries.has_transaction_permission",
    "EOD Tasks": "sahayog.sahayog.doctype.eod_tasks.eod_tasks.has_permission",
    "Approval Request": "sahayog.sahayog.doctype.approval_request.approval_request.has_permission",
    "Item": "sahayog.permissions.has_item_permission",
    "Loan Application": "sahayog.permissions.has_loan_application_permission",
    "MAC Activity": "sahayog.scrm.doctype.mac_activity.mac_activity.has_permission",
}

# DocType Class
# ---------------
# Override standard doctype classes

override_doctype_class = {
    "Warehouse": "sahayog.override.warehouse_doc_naming.CustomWarehouse",
    "User": "sahayog.override.user.CustomUser",
    "CRM Service Level Agreement": "sahayog.override.crm_service_level_agreement.CustomCRMServiceLevelAgreement",
    "Item": "sahayog.override.autoname_item.CustomItem",
    "Leave Application": "sahayog.override.leave_application.CustomLeaveApplication",
    "Serial and Batch Bundle": "sahayog.override.serial_batch_bundle_naming.CustomSerialAndBatchBundle",
    # "Report": "sahayog.override.report.CustomReport"

    "Report": "sahayog.override.report.CustomReport",
}

# Document Events
# ---------------
# Hook on document methods and events
doc_events = {
    "Employee Checkin": {
        "validate": "sahayog.doc_events.employee_checkin.clear_offshift",
    },
    "Employee": {
        "autoname": "sahayog.override.employee_naming.set_name_by_naming_series_override",
        "after_insert": [
            "sahayog.doc_events.create_user_from_employee.create_user",
            # "sahayog.doc_events.employee_warehouse.create_employee_warehouse"
        ],
        "validate": [
            # "sahayog.doc_events.employee.split_name_sync",
            # "sahayog.doc_events.employee.custom_division_sync",
            # "sahayog.doc_events.employee.custom_zone_sync",
            # "sahayog.doc_events.employee.custom_region_sync",
            # "sahayog.doc_events.employee.branch_sync",
            # "sahayog.doc_events.employee.designation_sync",
            # "sahayog.doc_events.employee.department_sync",
        ],
        "before_save": [
            "sahayog.doc_events.capital_emp_name.capital_emp_name",
            "sahayog.doc_events.employee.set_confirmation_date",
        ],
        # "before_save": [
        #      "sahayog.doc_events.employee.emp_enable_disable",
        # ],
    },
    "Project": {
        "on_update": [
            "sahayog.doc_events.project.update_branch_status",
        ],
    },
    "User": {
        "before_save": [
            "sahayog.doc_events.user.user_enable_disable",
            "sahayog.doc_events.user.capital_user_name",
        ],
    },
    "Task": {
        "autoname": ["sahayog.doc_events.task.task_custom_autoname"],
        "validate": [
            "sahayog.doc_events.task.validate_location_status",
            "sahayog.doc_events.task.validate_agreement_status",
            "sahayog.doc_events.task.check_loi_docstatus_for_task_2",
            "sahayog.doc_events.task.prevent_completion_if_manpower_incomplete",
            "sahayog.doc_events.task.prevent_completion_if_it_checklist_incomplete",
            "sahayog.doc_events.task.prevent_completion_if_infra_incomplete",
            "sahayog.doc_events.task.prevent_completion_if_lto_incomplete",
        ],
        "on_update": [
            "sahayog.doc_events.task.update_branch_status_trigger",
            "sahayog.doc_events.task.sync_task_to_loi_on_update",
            "sahayog.doc_events.task.update_lto_training_table",
        ],
        "after_insert": [
            "sahayog.doc_events.task.create_letter_of_intent",
            "sahayog.doc_events.task.after_insert_task",
        ],
        "before_save": [
            "sahayog.doc_events.task.fetch_manpower_settings",
            "sahayog.doc_events.task.fetch_infra_checklist_settings",
            "sahayog.doc_events.task.fetch_it_checklist_settings",
        ],
    },
    "Sahayog Settings": {
        "on_update": "sahayog.doc_events.task_template_settings.create_tasks_and_project_template",
        "after_save": "sahayog.doc_events.task_template_settings.create_tasks_and_project_template",
    },
    "Branch": {"before_save": "sahayog.doc_events.branch.update_employee_sol_id"},
    "Supplier Quotation": {
        "on_submit": "sahayog.doc_events.supplier_quotation.supplier_quotation_on_submit",
        "before_save": "sahayog.doc_events.supplier_quotation.sync_project_field",
    },
    "Project": {
        "after_insert": "sahayog.doc_events.project_warehouse.create_project_warehouse"
    },
    "Purchase Order": {
        # "on_update": "sahayog.doc_events.purchase_order.show_status_messages",
        "autoname": "sahayog.doc_events.purchase_order.purchase_order_autoname",
        "before_save": "sahayog.doc_events.purchase_order.fetch_terms_conditions",
        "validate": "sahayog.doc_events.purchase_order.validate_store_incharge_po",
    },
    "Purchase Receipt": {
        # "autoname": "sahayog.doc_events.purchase_receipt.purchase_receipt_autoname",
        # "before_save": "sahayog.doc_events.purchase_order.sync_project_field",
        # "validate": "sahayog.doc_events.purchase_receipt.validate_store_incharge",
    },
    "Department": {"autoname": "sahayog.doc_events.department.department_name"},
    "Lead": {
        "before_insert": [
            "sahayog.scrm.controller.lead.lead.update_employee_details",
            "sahayog.scrm.controller.lead.lead.set_is_operation_lead",
        ],
        "validate": [
            "sahayog.scrm.controller.lead.lead.validate_lead_mobile",
            "sahayog.scrm.controller.lead.lead.validate_lead_products",
            "sahayog.scrm.controller.lead.lead.validate_lead_source",
            "sahayog.scrm.controller.lead.lead.validate_duplicate_lead",
            "sahayog.scrm.controller.lead.lead.validate_required_employee_fields",
        ],
    },
    "Appointment": {
        "validate": [
            "sahayog.scrm.controller.lead.lead.validate_appointment_fields",
            "sahayog.scrm.controller.lead.lead.validate_appointment_party",
            "sahayog.scrm.controller.lead.lead.validate_appointment_time",
            "sahayog.scrm.controller.lead.lead.validate_duplicate_appointment",
        ],
    },
    "Shareholder": {
        "before_insert": [
            "sahayog.doc_events.shareholder.before_save",
        ],
        "autoname": [
            "sahayog.doc_events.shareholder.autoname",
        ],
    },
    "Share Transfer": {
        "autoname": "sahayog.doc_events.share_transfer.share_transfer_autoname"
    },
    "User": {
        "before_save": "sahayog.doc_events.delete_user_permissions.delete_user_permissions",
        "on_update": "sahayog.doc_events.delete_user_permissions.delete_user_permissions",
    },
    "Communication": {
        "after_insert": "sahayog.utils.hr_utils.notify_cc_on_incoming_reply"
    },
    "File": {
        "before_insert": "sahayog.petty_cash_management.api.file_hooks.force_public_for_petty_cash_transaction",
        "validate": "sahayog.petty_cash_management.api.file_hooks.force_public_for_petty_cash_transaction",
        "after_insert": "sahayog.petty_cash_management.api.file_hooks.force_public_after_save",
        "on_update": "sahayog.petty_cash_management.api.file_hooks.force_public_after_save"
    },
    "Asset": {
        "autoname": "sahayog.doc_events.asset.custom_asset_autoname"
    },
    "Leave Application": {
        "validate": "sahayog.doc_events.leave_application.validate"
    },
    "*": {
        "on_submit": "sahayog.branch_score_card.doctype.branch_score_card.branch_score_card.trigger_score_card_creation",
        "on_update": "sahayog.branch_score_card.doctype.branch_score_card.branch_score_card.trigger_score_card_creation"
    }
    
}

# Scheduled Tasks
# ---------------
scheduler_events = {
    "cron": {
        # Run daily at 5:00 AM — Early morning department ticket summary email & Agent sync job
        "0 5 * * *": [
            "sahayog.templates.emails.notification.send_department_wise_ticket_summary",
            "sahayog.api.auto_agent_creation.auto_create_agents_from_scheduler"
        ],
        # Run daily at 10:30 AM — Mid-morning follow-up ticket summary email
        "30 10 * * *": [
            "sahayog.templates.emails.notification.send_department_wise_ticket_summary"
        ],
        # "*/5 * * * *": [
        #     "sahayog.tasks.reset_auto_prepared_reports"
        # ],

        # Run daily at midnight — Sync District and State from Sahayog Branch
        # and auto-approve pending attendance corrections
        "0 0 * * *": [
            "sahayog.tasks.sync_district_state",
            "sahayog.tasks.auto_approve_attendance_corrections"
        ],
        "*/5 * * * *": ["sahayog.tasks.reset_auto_prepared_reports"],

        # Run daily at 2:00 AM — Sync Sahayog Branches from Finacle
        "0 2 * * *": [
            "sahayog.sahayog.doctype.sahayog_branch.sahayog_branch.auto_create_sahayog_branches_from_finacle"
        ],

        # "0 23 * * *" means: Run at minute 0 past hour 23 (11:00 PM) every day
        "0 23 * * *": [
            "sahayog.sahayog.api.eod.check_and_notify_inactive_teams"
        ],

        # Run at midnight on 1st of every month — credit monthly leave
        "0 0 1 * *": [
            "sahayog.tasks.monthly_leave_credit"
        ],

        # Run daily at 3:00 AM — auto-setup leave allocation
        "0 3 * * *": [
            "sahayog.tasks.auto_setup_new_employee_leave"
        ],
        # Daily at 10:00 PM (22:00)
        "0 22 * * *": [
            "sahayog.branch_score_card.doctype.crl_monitoring_and_branch_opening_and_closing.crl_monitoring_and_branch_opening_and_closing.sync_daily_crl"
        ]  

        # Run daily at 3:30 AM — generate fast lead report
        "30 3 * * *": [
            "sahayog.scrm.api.report_access.generate_fast_lead_report"
        ],

        # Run daily at 7:00 AM — L&D pre-training reminders (N days before training)
        "0 7 * * *": [
            "sahayog.agent_and_bdo.ld_notifications.send_pre_training_reminders"
        ],

        # Run daily at 9:00 AM — L&D post-training closure mails (for yesterday's trainings)
        "0 9 * * *": [
            "sahayog.agent_and_bdo.ld_notifications.send_post_training_closures"
        ],

        # Run daily at 8:45 AM — Bulk Update of Agent Commission JSON for all agents
        "45 8 * * *": [
            "sahayog.agent_and_bdo.doctype.agent.agent.bulk_update_agent_commissions"
        ],
    },
    # Runs all listed methods once per day (typically at midnight server time)
    "daily": [
        "sahayog.sahayog.doctype.sahayog_branch.sahayog_branch.auto_create_sahayog_branches_from_finacle",
        "sahayog.sahayog.doctype.bank_eod.bank_eod.create_daily_bank_eod",
    ],
    # --- Example blocks below: Uncomment if/when needed ---
    # "all": [
    #     # These tasks would be triggered every scheduler tick (default: every 60s)
    #     "sahayog.tasks.all"
    # ],
    "hourly": [
        # TEMPORARILY DISABLED — auto-approval of leave applications paused.
        # Re-enable by uncommenting the line below when management wants it back.
        # "sahayog.tasks.auto_approve_leave_applications",
    ],

    # "weekly": [
    #     # Runs once every week (Sunday midnight)
    #     "sahayog.tasks.weekly"
    # ],
    # "monthly": [
    #     # Runs once every month (1st day of month, midnight)
    #     "sahayog.tasks.monthly"
    # ]
}

# Testing
# -------

# before_tests = "sahayog.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "sahayog.event.get_events"
# }


override_whitelisted_methods = {
    "frappe.core.doctype.employee.employee.Employee.validate_for_enabled_user_id": "sahayog.override.employee_active_inactive.employee_active_inactive",
    "erpnext.stock.get_item_details.get_item_details": "sahayog.override.custom_get_item_details.custom_get_item_details",
    "erpnext.selling.doctype.customer.customer": "sahayog.override.override_make_contact.custom_make_contact",
    # "frappe.core.doctype.communication.email.make": "sahayog.override.email_sender_override.make"
}
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
override_doctype_dashboards = {
    # "Task": "sahayog.task.get_dashboard_data",
    "Project": "sahayog.dashboard.project_dashboard.get_data",
    "Asset": "sahayog.procurement.Asset.asset_dashboard.get_data",

}

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["sahayog.utils.before_request"]
# after_request = ["sahayog.utils.after_request"]

# Job Events
# ----------
# before_job = ["sahayog.utils.before_job"]
# after_job = ["sahayog.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"sahayog.auth.validate"
# ]

exempt_from_csrf = [
    "sahayog.api.eod.start_eod",
    "sahayog.api.eod.update_task_status",
    "sahayog.api.eod.close_eod",
    "sahayog.sahayog.api.eod.start_eod",
    "sahayog.sahayog.api.eod.update_task_status",
    "sahayog.sahayog.api.eod.close_eod",
    "sahayog.sahayog.page.pending_request.pending_request.get_pending_requests_count"
]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }


fixtures = [
    # Workflow Fixtures - Employee Material Request
    {"dt": "Workflow", "filters": [
        ["name", "in", ["Employee Material Request", "Asset state"]]]},
    # Disciplinary case Workflow
    {
        "dt": "Workflow",
        "filters": [["name", "in", ["Disciplinary Case", "Branch Proposal"]]],
    },
    # Unauthorized Absence Workflow
    {
        "dt": "Workflow",
        "filters": [["name", "=", "Unauthorized Absence"]],
    },
    # Workflow State for Disciplinary Case
    {
        "dt": "Workflow State",
        "filters": [
            [
                "workflow_state_name",
                "in",
                [
                    "Draft",
                    "Under Process",
                    "Under Review",
                    "Verified",
                    "Closed",
                    "Assign",
                    "Self Approve",
                    "Self Approved",
                    "Assigned",
                    "In Repair",
                    "Scrapped",
                    "Available"
                ]
            ]
        ]
    },
    # Case Closure Workflow
    {"dt": "Workflow", "filters": [["name", "=", "Case Closure"]]},
    # Workflow States for Case Closure

    # Workflow Action Master
    {
        "dt": "Workflow Action Master",
        "filters": [["workflow_action_name", "in", ["Submit"]]],
    },
    # Master Data
    {"dt": "Prodtech"},
    {"dt": "Item Department"},
    {"dt": "Module"},
    {"dt": "Letter Head"},
    {"dt": "Project Template"},
    # Permissions
    {
        "dt": "Custom DocPerm",
        "filters": [
            [
                "parent",
                "in",
                [
                    "Issue Register",
                    "Branch Proposal",
                    "Project",
                    "Project Template",
                    "Task",
                ],
            ]
        ],
    },
    # Task Templates
    {"dt": "Task", "filters": [["is_template", "=", "1"]]},
    # Workspaces
    {"doctype": "Workspace", "filters": [
        ["name", "in", ["Inventory Management", "Marketing Activity Dashboard"]]]},
    # Custom HTML Blocks
    {
        "dt": "Custom HTML Block",
        "filters": [
            [
                "name",
                "in",
                [
                    "Sahayog Projects",
                    "Sahayog Home",
                    "BDO Performance",
                    "MIS Report List",
                    "Disciplinary Management Dashboard",
                    "Inventory",
                    "Product Type Chart",
                    "DAMS dashboard",
                    "Audit Management",
                    "Tickets Dashboard",
                    "Finacle Dashboard",
                    "IT Dashboard",
                    "Petty Cash Dashboard Widget",
                    "MAC Activity",
                ],
            ]
        ],
    },
    # Property Setters
    {
        "doctype": "Property Setter",
        "filters": [
            [
                "name",
                "in",
                [
                    "Material Request-schedule_date-reqd",
                    "Purchase Receipt-main-field_order",
                    "Stock Entry-section_break_jwgn-collapsible",
                    "Asset Movement Item-target_location-fieldtype",
                    "Asset Movement Item-target_location-options",
                    "Asset Movement Item-source_location-fieldtype",
                    "Asset Movement Item-source_location-options"
                ],
            ]
        ],
    },
    # email templates fixtures
    {
        "dt": "Email Template",
        "filters": [
            ["name", "in", [
                "Disciplinary Case Update",
                "Disciplinary - SCN",
                "Response to SCN",
                "Suspension Process",
                "Domestic Enquiry Notice",
                "Reminder Notice of Enquiry",
                "Unauthorized Absence",
                "Reminder Of Unauthorized Absence",
                "Case Closure Update",
                "new_group_approval_request"
            ]]
        ],
    },


    # Print Format fixture
    {
        "dt": "Print Format",
        "filters": [["name", "in", [
            "Reminder Unauthorized absence",
            "Disciplinary Case Notice",
            "Caution Letter",
            "Warning Letter",
            "Suspension Order",
            "Domestic Enquiry",
            "Ex Parte Enquiry",
            "Reminder Notice Of Enquiry",
            "Office Order Termination of Services",
            "Termination due to abandonment"
        ]]]
    },

]
