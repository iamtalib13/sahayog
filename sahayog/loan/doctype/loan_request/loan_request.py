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
