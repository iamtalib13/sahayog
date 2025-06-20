# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document

class Meeting(Document):
    def before_insert(self):
        self.set_trainer_from_user()

    def set_trainer_from_user(self):
        try:
            employee_name = frappe.db.get_value('Employee', {'user_id': frappe.session.user}, 'name')
            if not employee_name:
                frappe.throw("Employee not found for the current user.")
            self.trainer = employee_name
        except Exception as e:
            frappe.throw("An unexpected error occurred while setting the trainer.")


@frappe.whitelist()
def get_agent_full_name(reference_doctype, agent_employee):
    if not reference_doctype or not agent_employee:
        return ""

    name_field = "employee_name" if reference_doctype == "Employee" else "agent_name"

    full_name = frappe.db.get_value(reference_doctype, agent_employee, name_field)
    return full_name or ""