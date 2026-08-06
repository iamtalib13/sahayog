import frappe

def get_context(context):
	frappe.enqueue("sahayog.scrm.doctype.mac_activity.mac_activity.ensure_qr_code", queue="short")
