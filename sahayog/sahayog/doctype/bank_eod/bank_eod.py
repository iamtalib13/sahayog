# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe import _
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

    def validate(self):
        if self.get_db_value("status") == "Closed":
            frappe.throw(_("Closed EOD record for {0} cannot be modified.").format(self.date))
        self.check_all_tasks_completed()

    def check_all_tasks_completed(self):
        """
        If all tasks in the child table are 'Completed', set status to 'Completed'.
        """
        if not self.eod_tasks:
            return

        all_completed = all(task.status == "Completed" for task in self.eod_tasks)
        
        if all_completed:
            # Only auto-upgrade to Completed if it's currently Pending
            if self.status == "Pending":
                self.status = "Completed"
                frappe.msgprint(_("All tasks completed. Bank EOD status set to Completed."))
        else:
            # If tasks are pending and status is Completed or Closed, set back to Pending
            if self.status in ["Completed", "Closed"]:
                self.status = "Pending"
                frappe.msgprint(_("Some tasks are still pending. Bank EOD status set to Pending."))

    # def load_tasks(self):
    #     """
    #     Fetch all active EOD Checklists and populate EOD Tasks child table,
    #     ordered by Team sequence.
    #     """
    #     if self.eod_tasks:
    #         return

    #     # Fetch active checklists with team sequence
    #     active_checklists = frappe.db.sql("""
    #         SELECT 
    #             ec.name, ec.team, et.sequence
    #         FROM 
    #             `tabEOD Checklist` ec
    #         JOIN 
    #             `tabEOD Team` et ON ec.team = et.name
    #         WHERE 
    #             ec.is_active = 1
    #         ORDER BY 
    #             et.sequence ASC, et.name ASC
    #     """, as_dict=True)

    #     for checklist in active_checklists:
    #         doc = frappe.get_doc("EOD Checklist", checklist.name)
    #         # Sort checklist items by sequence and idx
    #         sorted_items = sorted(doc.checklist_items, key=lambda x: (x.sequence or 0, x.idx))
    #         for item in sorted_items:
    #             self.append("eod_tasks", {
    #                 "team": checklist.team,
    #                 "sequence": checklist.sequence,
    #                 "task": item.task,
    #                 "status": "Pending"
    #             })


    def load_tasks(self):
        """
        Fetch all active EOD Checklists and populate EOD Tasks child table,
        ordered by Team sequence.
        """
        if self.eod_tasks:
            return

        # NEW FIX: Checking if the TEAM itself is active (et.is_active = 1)
        # instead of just the checklist item!
        active_checklists = frappe.db.sql("""
            SELECT 
                ec.name, ec.team, et.sequence
            FROM 
                `tabEOD Checklist` ec
            JOIN 
                `tabEOD Team` et ON ec.team = et.name
            WHERE 
                et.is_active = 1   -- <--- THIS IS THE FIX (et instead of ec)
            ORDER BY 
                et.sequence ASC, et.name ASC
        """, as_dict=True)

        for checklist in active_checklists:
            doc = frappe.get_doc("EOD Checklist", checklist.name)
            # Sort checklist items by sequence and idx
            sorted_items = sorted(doc.checklist_items, key=lambda x: (x.sequence or 0, x.idx))
            for item in sorted_items:
                self.append("eod_tasks", {
                    "team": checklist.team,
                    "sequence": checklist.sequence,
                    "task": item.task,
                    "status": "Pending"
                })


@frappe.whitelist()
def get_checklist_tasks():
    """
    Returns a list of tasks from all active checklists, ordered by sequence.
    """
    tasks = []
    
    # Fetch active checklists with team sequence
    active_checklists = frappe.db.sql("""
        SELECT 
            ec.name, ec.team, et.sequence
        FROM 
            `tabEOD Checklist` ec
        JOIN 
            `tabEOD Team` et ON ec.team = et.name
        WHERE 
            ec.is_active = 1
        ORDER BY 
            et.sequence ASC, et.name ASC
    """, as_dict=True)

    for checklist in active_checklists:
        doc = frappe.get_doc("EOD Checklist", checklist.name)
        # Sort checklist items by sequence and idx
        sorted_items = sorted(doc.checklist_items, key=lambda x: (x.sequence or 0, x.idx))
        for item in sorted_items:
            tasks.append({
                "team": checklist.team,
                "sequence": checklist.sequence,
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
