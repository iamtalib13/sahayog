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
    "Supplier Quotation": "public/js/supplier_quotation.js",
    "Request for Quotation": "public/js/request_for_quotation.js",
    "Material Request": "public/js/material_request.js",
    "Workspace": "public/js/workspace.js",
    "Task": "public/js/task.js",
  
}
app_include_js = "/assets/frappe/js/frappe-web.min.js"

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
role_home_page = {
    "Supplier": "/supplier-portal"
}

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
    "sahayog.patches.custom_fields.add_custom_fields_for_project.execute",
    "sahayog.patches.custom_fields.add_custom_fields_for_designation.execute",
    "sahayog.patches.custom_fields.add_custom_fields_for_employee.execute",
    "sahayog.patches.custom_fields.add_custom_fields_for_task.execute",
    "sahayog.patches.custom_fields.add_custom_fields_for_file.execute",
    "sahayog.patches.custom_fields.add_custom_fields_for_request_for_quotation.execute",
    "sahayog.patches.custom_fields.add_custom_field_for_supplier_quotation_item.execute",
    "sahayog.patches.custom_fields.add_custom_fields_for_branch.execute",    
    "sahayog.patches.custom_fields.add_custom_field_for_stock_entry.execute",  
    "sahayog.patches.custom_fields.add_custom_field_for_material_request.execute",  
    "sahayog.patches.custom_fields.add_custom_field_for_warehouse.execute",  
    "sahayog.patches.custom_fields.add_custom_field_for_supplier_quotation.execute",
    "sahayog.patches.custom_fields.add_custom_field_for_purchase_order.execute",
    "sahayog.patches.custom_fields.add_custom_field_for_purchase_receipt.execute",
    "sahayog.patches.fixtures.add_region.execute",
    "sahayog.patches.fixtures.add_division.execute",
    "sahayog.patches.fixtures.add_zone.execute",
    "sahayog.patches.fixtures.add_module_profile.execute",
    "sahayog.patches.fixtures.add_role_profile.execute",
    "sahayog.patches.fixtures.hr_setting.execute",
    "sahayog.patches.fixtures.set_view_setting_of_project.execute",
    "sahayog.patches.fixtures.add_role_and_role_profile_for_project_doctype.execute",
    "sahayog.patches.fixtures.allow_login_using_user_name.execute",
    "sahayog.patches.fixtures.add_custom_html_block_for_project.execute",
    "sahayog.patches.fixtures.add_item_group.execute",
    "sahayog.patches.fixtures.add_warehouses.execute",
    "sahayog.patches.fixtures.add_read_role_permission.execute",
    "sahayog.patches.fixtures.add_role_profile_for_stock_user.execute",
    "sahayog.patches.fixtures.set_project_template_mandatory.execute",


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

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

override_doctype_class = {
    "Warehouse": "sahayog.override.warehouse_doc_naming.CustomWarehouse",
   # "Material Request": "sahayog.override.item_description_blank.CustomMaterialRequest"
}

# Document Events
# ---------------
# Hook on document methods and events
doc_events = {
    "Employee": {
        "after_insert": [
            "sahayog.doc_events.create_user_from_employee.create_user",
            "sahayog.doc_events.employee_warehouse.create_employee_warehouse"
        ],
      
        "before_save": [
            "sahayog.doc_events.capital_emp_name.capital_emp_name",
            
        ],
        "before_save": [
             "sahayog.doc_events.employee.emp_enable_disable",
            
        ],
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

        "after_insert": [
            "sahayog.doc_events.task.create_letter_of_intent",   
        ],
        "on_update": [
            "sahayog.doc_events.task.update_branch_status_trigger",
        ],
        "validate": [
            "sahayog.doc_events.task.validate_location_status",
            "sahayog.doc_events.task.validate_agreement_status",
            "sahayog.doc_events.task.check_loi_docstatus_for_task_2",
            
        ],
        
    },  
    
    "Sahayog Settings": {
        "on_update": "sahayog.doc_events.task_template_settings.create_tasks_and_project_template",
        "after_save": "sahayog.doc_events.task_template_settings.create_tasks_and_project_template"
    },

    "Branch": {
        "after_insert": "sahayog.doc_events.branch_warehouse.create_branch_warehouse"
    },

    "Supplier Quotation": {
        "on_submit": "sahayog.doc_events.supplier_quotation.supplier_quotation_on_submit",
        "before_save": "sahayog.doc_events.supplier_quotation.sync_project_field"
    },
      
    "Project": {
        "after_insert": "sahayog.doc_events.project_warehouse.create_project_warehouse"
    },
    "Purchase Order": {
        "on_submit": "sahayog.doc_events.purchase_order.create_purchase_receipt",
        "autoname": "sahayog.doc_events.purchase_order.purchase_order_autoname"
    },
    "Purchase Receipt": {
        "autoname": "sahayog.doc_events.purchase_receipt.purchase_receipt_autoname"
    }


}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"sahayog.tasks.all"
# 	],
# 	"daily": [
# 		"sahayog.tasks.daily"
# 	],
# 	"hourly": [
# 		"sahayog.tasks.hourly"
# 	],
# 	"weekly": [
# 		"sahayog.tasks.weekly"
# 	],
# 	"monthly": [
# 		"sahayog.tasks.monthly"
# 	],
# }

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
    "frappe.model.naming.set_name_by_naming_series": "sahayog.override.employee_naming.set_name_by_naming_series_override",
    "frappe.core.doctype.employee.employee.Employee.validate_for_enabled_user_id": "sahayog.override.employee_active_inactive.employee_active_inactive"
    
}
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
override_doctype_dashboards = {
	#"Task": "sahayog.task.get_dashboard_data",
    "Project": "sahayog.dashboard.project_dashboard.get_data",

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

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

fixtures = [
    {
        "dt": "Print Format",
        "filters": [
            ["name", "=", "LOI"]
        ]
    },
    {
        "dt": "Prodtech",
        
    },
    {
        "dt": "Module",
        
    },

   
    {
        "dt": "Custom DocPerm",
        "filters": [["parent", "=", "Issue Register"]]
    }

]
