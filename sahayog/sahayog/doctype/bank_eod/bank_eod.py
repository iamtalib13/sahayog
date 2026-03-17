# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import nowdate

class BankEOD(Document):
    def autoname(self):
        # Format the name as EOD-DD-MM-YYYY based on the date field
        if self.date:
            from frappe.utils import getdate
            d = getdate(self.date)
            self.name = d.strftime("EOD-%d-%m-%Y")

    def before_insert(self):
        self.load_tasks()

    def load_tasks(self):
        """
        Fetch all active EOD Checklists and populate EOD Tasks child table.
        """
        if self.eod_tasks:
            return

        active_checklists = frappe.get_all(
            "EOD Checklist",
            filters={"is_active": 1},
            fields=["name", "team"]
        )

        for checklist in active_checklists:
            doc = frappe.get_doc("EOD Checklist", checklist.name)
            for item in doc.checklist_items:
                self.append("eod_tasks", {
                    "team": checklist.team,
                    "task": item.task,
                    "status": "Pending"
                })

@frappe.whitelist()
def get_checklist_tasks():
    """
    Returns a list of tasks from all active checklists.
    """
    tasks = []
    active_checklists = frappe.get_all(
        "EOD Checklist",
        filters={"is_active": 1},
        fields=["name", "team"]
    )

    for checklist in active_checklists:
        doc = frappe.get_doc("EOD Checklist", checklist.name)
        for item in doc.checklist_items:
            tasks.append({
                "team": checklist.team,
                "task": item.task
            })
    return tasks

@frappe.whitelist()
def create_daily_bank_eod():
    """
    Creates or returns the daily Bank EOD record.
    """
    today = nowdate()
    existing_eod = frappe.db.exists("Bank EOD", {"date": today})
    
    if not existing_eod:
        eod = frappe.new_doc("Bank EOD")
        eod.date = today
        eod.status = "Open"
        eod.insert(ignore_permissions=True)
        return eod.name
    
    return existing_eod
# END