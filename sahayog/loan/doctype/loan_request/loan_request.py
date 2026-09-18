# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import date_diff, getdate
import re


class LoanRequest(Document):
	def validate(self):
		self.calculate_vintage()
		self.set_default_documents()
		self.validate_kyc_documents()
		self.validate_attachments_required()

	def before_save(self):
		if self.status == "Pending Credit Review":
			if not self.scheme_code:
				self.scheme_code = ""
			if not self.approved_loan_amount:
				self.approved_loan_amount = ""

	def calculate_vintage(self):
		"""Auto-calculate vintage/complete days from deposit_date"""
		if self.deposit_date:
			self.vintage_complete_days = date_diff(getdate(), getdate(self.deposit_date))
		else:
			self.vintage_complete_days = 0

	def set_default_documents(self):
		"""Same fixed docs as Loan Application first form"""
		default_docs = ["Aadhaar Card", "PAN Card", "Application Form", "Customer Signature"]
		existing = [d.document_type for d in (self.document_checklist or [])]
		if self.is_new() and not existing:
			for doc_type in default_docs:
				self.append("document_checklist", {"document_type": doc_type, "status": "Pending"})
		else:
			for doc_type in default_docs:
				if doc_type not in existing:
					self.append("document_checklist", {"document_type": doc_type, "status": "Pending"})

	def validate_kyc_documents(self):
		"""Same duplicate check as Loan Application"""
		types = []
		for d in (self.document_checklist or []):
			if d.document_type in types:
				frappe.throw(f"Duplicate KYC Type: {d.document_type}")
			types.append(d.document_type)

	def validate_attachments_required(self):
		"""Request-only: file + number must exist, else save/send blocked"""
		import re
		for d in (self.document_checklist or []):
			dtype = (d.document_type or "").strip()
			if not dtype:
				frappe.throw("Document Type is required in Document Checklist")
			if not d.document_file:
				frappe.throw(f"{dtype}: attachment file is required")
			if dtype in ("Aadhaar Card", "PAN Card"):
				dnum = ((d.document_number or "").strip()).upper()
				if not dnum:
					frappe.throw(f"{dtype}: Document Number is required")
				if dtype == "Aadhaar Card" and not re.match(r"^[2-9]\d{11}$", dnum):
					frappe.throw("Aadhaar Number must be 12 digits starting with 2-9")
				if dtype == "PAN Card" and not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", dnum):
					frappe.throw("Invalid PAN Number format (e.g. ABCDE1234F)")

	@frappe.whitelist()
	def create_loan_application(self):
		"""Return mapped fields for Loan Application creation"""
		if self.status != "Approved":
			frappe.throw("Loan Application can only be created from Approved Loan Request")

		return {
			"loan_type": self.loan_type,
			"branch_code": self.branch,
			"customer_name": self.customer,
			"mobile_number": self.mobile_number,
			"loan_amount": self.approved_loan_amount or self.required_loan_amount,
			"purpose_of_loan": self.purpose_of_loan,
			"kyc_documents": [
				{
					"document_type": d.document_type,
					"document_number": d.document_number,
					"document_file": d.document_file,
					"status": d.status or "Pending",
					"remark": d.remark,
				}
				for d in (self.document_checklist or [])
			],
		}
