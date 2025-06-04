# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Attendees(Document):
	pass


@frappe.whitelist()
def get_attendee_name(reference_doctype, agent_employee):
    if reference_doctype == "Employee":
        return frappe.db.get_value("Employee", agent_employee, "employee_name")
    elif reference_doctype == "Agent":
        return frappe.db.get_value("Agent", agent_employee, "full_name")
    else:
        return None