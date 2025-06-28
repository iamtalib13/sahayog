import frappe
from frappe.query_builder import functions
from frappe.utils import today
import erpnext.crm.utils

def patched_open_leads_opportunities_based_on_todays_event():
	event = frappe.qb.DocType("Event")
	event_link = frappe.qb.DocType("Event Participants")

	query = (
		frappe.qb.from_(event)
		.join(event_link)
		.on(event_link.parent == event.name)
		.select(event_link.reference_doctype, event_link.reference_docname)
		.where(
			(event_link.reference_doctype.isin(["Lead", "Opportunity"]))
			& (event.status == "Open")
			& (functions.Date(event.starts_on) == today())
		)
	)
	data = query.run(as_dict=True)

	for d in data:
		frappe.db.set_value(d.reference_doctype, d.reference_docname, "status", "Follow Up")
		print("✅ Running PATCHED version of open_leads_opportunities_based_on_todays_event")



def apply_patches():
	# This replaces the ERPNext function with yours at runtime
	erpnext.crm.utils.open_leads_opportunities_based_on_todays_event = patched_open_leads_opportunities_based_on_todays_event
