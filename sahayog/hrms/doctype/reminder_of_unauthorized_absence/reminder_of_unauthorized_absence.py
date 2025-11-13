# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document

class ReminderOfUnauthorizedAbsence(Document):
    def autoname(self):
        """Generate structured name and link with latest Unauthorized Absence"""
        if self.case_id:
            # Find latest Unauthorized Absence for same case
            latest_ua = frappe.db.get_list(
                "Unauthorized Absence",
                filters={"case_id": self.case_id},
                fields=["name"],
                order_by="creation desc",
                limit_page_length=1,
            )

            # If found, link it
            if latest_ua:
                self.unauthorized_absence_id = latest_ua[0].name

            # Count reminders for same case
            count = frappe.db.count("Reminder Of Unauthorized Absence", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-RUA-{count:02d}"

        else:
            # fallback autoname if no case linked
            self.name = frappe.model.naming.make_autoname("RUA-.#####")
