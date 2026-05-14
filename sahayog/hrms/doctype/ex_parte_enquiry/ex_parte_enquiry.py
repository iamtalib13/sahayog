# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ExParteEnquiry(Document):
	def autoname(self):
		"""Generate structured name based on Case ID"""
		if self.case_id:
			# Count ex parte enquiries for same case
			count = frappe.db.count("Ex Parte Enquiry", {"case_id": self.case_id}) + 1
			self.name = f"{self.case_id}-EXP-{count:02d}"
		else:
			# fallback autoname if no case linked
			self.name = frappe.model.naming.make_autoname("EXP-.#####")

