# Copyright (c) 2026, Sahayog and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt

class SalaryRegister(Document):
	def validate(self):
		self.calculate_totals()
	
	def calculate_totals(self):
		"""Calculate total deductions and net salary"""
		self.total_deductions = (
			flt(self.medical_deduction) +
			flt(self.staff_loan_emi) +
			flt(self.other_deduction)
		)
		
		self.net_salary = flt(self.gross_salary) - flt(self.total_deductions)
	
	def before_save(self):
		# Validate other deduction has reason if amount > 0
		if flt(self.other_deduction) > 0 and not self.other_deduction_reason:
			frappe.throw("Please provide reason for Other Deduction")
