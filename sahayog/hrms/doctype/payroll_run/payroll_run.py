# Copyright (c) 2026, Sahayog and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class PayrollRun(Document):
	def validate(self):
		# Validate payroll month format
		if self.payroll_month:
			import re
			if not re.match(r'^\d{4}-\d{2}$', self.payroll_month):
				frappe.throw("Payroll Month must be in YYYY-MM format (e.g., 2026-07)")
		
		# Check duplicate for same month
		if self.is_new():
			existing = frappe.db.exists("Payroll Run", {
				"payroll_month": self.payroll_month,
				"status": ["!=", "Cancelled"],
				"name": ["!=", self.name]
			})
			if existing:
				frappe.throw(f"Payroll for {self.payroll_month} already exists: {existing}")
	
	def on_trash(self):
		# Delete associated salary registers
		salary_registers = frappe.get_all("Salary Register", filters={"payroll_run": self.name})
		for sr in salary_registers:
			frappe.delete_doc("Salary Register", sr.name, ignore_permissions=True)
