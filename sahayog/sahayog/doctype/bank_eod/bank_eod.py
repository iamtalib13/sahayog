# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import nowdate

class BankEOD(Document):
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
def create_daily_bank_eod():
    """
    Scheduler job to create daily Bank EOD record.
    """
    today = nowdate()
    if not frappe.db.exists("Bank EOD", {"date": today}):
        eod = frappe.new_doc("Bank EOD")
        eod.date = today
        eod.status = "Open"
        eod.insert(ignore_permissions=True)
        return eod.name
    return None
