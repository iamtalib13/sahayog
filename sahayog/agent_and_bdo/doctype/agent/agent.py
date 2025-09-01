# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class Agent(Document):
    def before_save(self):
        if self.agent_name:
            self.agent_name = self.agent_name.upper()

    @frappe.whitelist()
    def allocation_request(self):
        """Raise allocation request"""
        self.requested_by = frappe.session.user
        self.requested_on = frappe.utils.now_datetime()
        self.status = "Pending"
        self.save()
        return {"success": True, "message": "Allocation requested"}

    @frappe.whitelist()
    def approve_allocation(self):
        """Approve allocation and set employee"""
        self.approved_by = frappe.session.user
        self.approved_on = frappe.utils.now_datetime()
        self.status = "Allocated"

        # Find Employee linked with requested_by user
        if self.requested_by:
            employee = frappe.db.get_value("Employee", {"user_id": self.requested_by}, "name")
            if employee:
                self.employee = employee
            else:
                frappe.throw(f"No Employee record found for user {self.requested_by}")

        self.save()
        return {"success": True, "message": "Agent Allocated Successfully"}

    @frappe.whitelist()
    def reject_allocation(self):
        """Reject allocation and clear request info"""
        self.requested_by = None
        self.requested_on = None
        self.status = "Unallocated"
        self.save()
        return {"success": True, "message": "Agent Allocation Rejected"}

    @frappe.whitelist()
    def unallocate_agent(self):
        """Unallocate agent and clear all mapping"""
        self.status = "Unallocated"
        self.requested_by = None
        self.requested_on = None
        self.approved_by = None
        self.approved_on = None
        self.employee = None
        self.save()
        return {"success": True, "message": "Agent Unallocated Successfully"}
    
@frappe.whitelist()
def bulk_unallocate(agent_names: list[str] | str = None):
    """Unallocate selected agents (bulk)"""
    if isinstance(agent_names, str):
        import json
        agent_names = json.loads(agent_names)

    if not agent_names:
        return {"success": False, "message": "No agents selected for unallocation"}

    for agent in agent_names:
        doc = frappe.get_doc("Agent", agent)
        doc.status = "Unallocated"
        doc.requested_by = None
        doc.requested_on = None
        doc.approved_by = None
        doc.approved_on = None
        doc.employee = None
        doc.save()

    return {
        "success": True,
        "count": len(agent_names),
        "message": f"{len(agent_names)} agent(s) unallocated successfully",
    }

@frappe.whitelist()
def bulk_transfer(agent_names: list[str] | str = None, to_employee: str = None):
    """Transfer selected agents to another employee"""
    if isinstance(agent_names, str):
        import json
        agent_names = json.loads(agent_names)

    if not agent_names:
        return {"success": False, "message": "No agents selected for transfer"}

    if not to_employee:
        return {"success": False, "message": "Target employee not provided"}

    for agent in agent_names:
        doc = frappe.get_doc("Agent", agent)
        doc.employee = to_employee
        doc.save()

    return {
        "success": True,
        "count": len(agent_names),
        "message": f"{len(agent_names)} agent(s) transferred to employee {to_employee} successfully",
    }