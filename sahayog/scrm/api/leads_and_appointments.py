import frappe
from frappe import _

@frappe.whitelist()
def get_lead_appointment_count():
    user = frappe.session.user
    is_admin = user == "Administrator"

    def count(doctype, status):
        filters = {"status": status}
        if not is_admin:
            filters["owner"] = user
        return frappe.db.count(doctype, filters)

    return {
        "lead": count("Lead", "Lead"),
        "converted": count("Lead", "Converted"),
        "follow_up": count("Lead", "Follow Up"),
        "not_interested": count("Lead", "Not Interested"),
        "opportunity": count("Lead", "Opportunity"),
        "open": count("Appointment", "Open"),
        "closed": count("Appointment", "Closed"),
    }