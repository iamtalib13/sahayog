# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document

class UnauthorizedAbsence(Document):
    def autoname(self):
        """Generate structured name based on linked Disciplinary Case"""
        if self.case_id:
            count = frappe.db.count("Unauthorized Absence", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-UA-{count:02d}"
        else:
            # fallback naming if no case linked
            self.name = frappe.model.naming.make_autoname("UA-.#####")
