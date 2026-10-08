import frappe
from insights.www.insights import get_context as insights_get_context

no_cache = 1


def get_context(context):
	insights_get_context(context)
	# Only Insights Admin sees the full sidebar; others get Dashboards only
	context.restrict_insights_sidebar = "Insights Admin" not in frappe.get_roles()
