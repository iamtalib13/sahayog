# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ExParteEnquiry(Document):
	def before_insert(self):
		self._validate_ua_response()
		self._fetch_case_details()

	def validate(self):
		self._validate_ua_response()

	def _fetch_case_details(self):
		"""
		Fetch and fill case-related fields from the parent case document.
		Works for both UA track (Unauthorized Absence) and
		Disciplinary track (Disciplinary Case).
		"""
		if not self.case_id:
			return

		if str(self.case_id).startswith("UA"):
			# UA track — fetch from Unauthorized Absence
			ua = frappe.db.get_value(
				"Unauthorized Absence",
				{"case_id": self.case_id},
				[
					"employee_id", "employee_name", "designation",
					"branch_id", "branch_name", "zone_name",
					"issue_occurrence_date", "issue_reported_to_hr",
					"issue_in_details", "status", "date_of_1st_letter",
					"amount_of_fraud"
				],
				as_dict=True,
				order_by="creation desc"
			)
			if ua:
				self.employee_id       = ua.employee_id
				self.employee_name     = ua.employee_name
				self.designation       = ua.designation
				self.branch_id         = ua.branch_id
				self.branch_name       = ua.branch_name
				self.zone_name         = ua.zone_name
				self.issue_occurrence_date  = ua.issue_occurrence_date
				self.issue_reported_to_hr   = ua.issue_reported_to_hr
				self.issue_in_details       = ua.issue_in_details
				self.status                 = ua.status
				self.date_of_1st_letter     = ua.date_of_1st_letter
				self.amount_of_fraud        = ua.amount_of_fraud
		else:
			# Disciplinary track — fetch from Disciplinary Case
			dc = frappe.db.get_value(
				"Disciplinary Case",
				self.case_id,
				[
					"employee_id", "employee_name", "designation",
					"branch_id", "branch_name", "zone",
					"issue_occurrence_date", "issue_report_to_hr",
					"description", "status"
				],
				as_dict=True
			)
			if dc:
				self.employee_id            = dc.employee_id
				self.employee_name          = dc.employee_name
				self.designation            = dc.designation
				self.branch_id              = dc.branch_id
				self.branch_name            = dc.branch_name
				self.zone_name              = dc.zone
				self.issue_occurrence_date  = dc.issue_occurrence_date
				self.issue_reported_to_hr   = dc.issue_report_to_hr
				self.issue_in_details       = dc.description
				self.status                 = dc.status

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
		# This validation only applies to Unauthorized Absence track (case_id starts with "UA")
		if not self.case_id or not str(self.case_id).startswith("UA"):
			return

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

