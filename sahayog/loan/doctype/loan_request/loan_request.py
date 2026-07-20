# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import date_diff, getdate


class LoanRequest(Document):
	def validate(self):
		self.calculate_vintage()

	def calculate_vintage(self):
		"""Auto-calculate vintage/complete days from deposit_date"""
		if self.deposit_date:
			self.vintage_complete_days = date_diff(getdate(), getdate(self.deposit_date))
		else:
			self.vintage_complete_days = 0

	@frappe.whitelist()
	def create_loan_application(self):
		"""Create Loan Application from approved Loan Request"""
		if self.status != "Approved":
			frappe.throw("Loan Application can only be created from Approved Loan Request")

		loan_application = frappe.get_doc({
			"doctype": "Loan Application",
			"loan_type": self.loan_type,
			"branch_code": self.branch,
			"customer_name": self.customer,
			"mobile_number": self.mobile_number,
			"loan_amount": self.approved_loan_amount or self.required_loan_amount,
			"purpose_of_loan": self.purpose_of_loan,
		})
		loan_application.insert()
		frappe.db.commit()

		return loan_application.name
