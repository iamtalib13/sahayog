# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ExParteEnquiry(Document):
	def before_insert(self):
		self._validate_ua_response()

	def validate(self):
		self._validate_ua_response()

	def _latest_ua_response(self):
		if not self.case_id:
			return None

		latest_ua = frappe.get_all(
			"Unauthorized Absence",
			filters={"case_id": self.case_id},
			fields=["response_of_ua"],
			order_by="creation desc",
			limit_page_length=1,
		)

		if not latest_ua:
			return None

		return latest_ua[0].get("response_of_ua")

	def _validate_ua_response(self):
		if self._latest_ua_response() == "Satisfactory":
			frappe.throw(
				"Ex Parte Enquiry cannot be created because the linked Unauthorized Absence has Status of Response set to Satisfactory."
			)

	def autoname(self):
		"""Generate structured name based on Case ID"""
		if self.case_id:
			# Count ex parte enquiries for same case
			count = frappe.db.count("Ex Parte Enquiry", {"case_id": self.case_id}) + 1
			self.name = f"{self.case_id}-EXP-{count:02d}"
		else:
			# fallback autoname if no case linked
			self.name = frappe.model.naming.make_autoname("EXP-.#####")

