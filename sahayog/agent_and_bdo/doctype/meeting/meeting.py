# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document

class Meeting(Document):
    def before_insert(self):
        self.set_trainer_from_user()

    def set_trainer_from_user(self):
        # Admin / System Manager can create meetings without a linked Employee
        roles = frappe.get_roles(frappe.session.user)
        if 'Administrator' in roles or 'System Manager' in roles:
            return
        employee_name = frappe.db.get_value('Employee', {'user_id': frappe.session.user}, 'name')
        if not employee_name:
            frappe.throw("Employee not found for the current user.")
        self.trainer = employee_name


@frappe.whitelist()
def get_agent_full_name(reference_doctype, agent_employee):
    if not reference_doctype or not agent_employee:
        return ""

    name_field = "employee_name" if reference_doctype == "Employee" else "agent_name"

    full_name = frappe.db.get_value(reference_doctype, agent_employee, name_field)
    return full_name or ""


@frappe.whitelist()
def get_branch_attendees(branch, attendee_type=None):
    if not branch or not attendee_type:
        return []

    attendees = []

    if attendee_type == "Employee":
        employees = frappe.db.get_all("Employee",
            filters={"sahayog_branch": branch, "status": "Active"},
            fields=["name", "employee_name"])
        for emp in employees:
            attendees.append({
                "reference_doctype": "Employee",
                "agent_employee": emp.name,
                "full_name": emp.employee_name
            })

    elif attendee_type == "Agent":
        agents = frappe.db.get_all("Agent",
            filters={"branch_code": branch, "status": "Allocated"},
            fields=["name", "agent_name"])
        for ag in agents:
            attendees.append({
                "reference_doctype": "Agent",
                "agent_employee": ag.name,
                "full_name": ag.agent_name
            })

    return attendees