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

    "Workspace": "public/js/workspace.js",
    "Task": "public/js/task.js",
  
}
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
# 	"Role": "home_page"
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
    "sahayog.patches.custom_fields.add_custom_fields_for_project.execute",
    "sahayog.patches.custom_fields.add_custom_fields_for_designation.execute",
    "sahayog.patches.fixtures.add_region.execute",
    "sahayog.patches.fixtures.add_division.execute",
    "sahayog.patches.fixtures.add_zone.execute",

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

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
 "Employee": {
        "after_insert": "sahayog.doc_events.create_user_from_employee.create_user",
      

        "before_save": [
            "sahayog.doc_events.capital_emp_name.capital_emp_name",
            
        ],
        "before_save": [
             "sahayog.doc_events.employee.emp_enable_disable",
            
        ],
    },
    "User": {
       
        "before_save": [
            
            "sahayog.doc_events.user.user_enable_disable",   
        ],
    },
    "Task": {
       
        "after_insert": [
            "sahayog.doc_events.task.create_letter_of_intent",   
        ],
    },

    
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
# override_doctype_dashboards = {
# 	"Task": "sahayog.task.get_dashboard_data"
# }

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

