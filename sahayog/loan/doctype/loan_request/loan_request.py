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
				self.approved_loan_amount = 0

	def calculate_vintage(self):
		"""Auto-calculate vintage/complete days from deposit_date"""
		if self.deposit_date:
			self.vintage_complete_days = date_diff(getdate(), getdate(self.deposit_date))
		else:
			self.vintage_complete_days = 0

	def set_default_documents(self):
		"""Same fixed docs as Loan Application first form"""
		default_docs = ["Aadhaar Card", "PAN Card", "Application Form", "Valuation Report", "Ornament Image"]
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
			"loan_request": self.name,
			"loan_type": self.loan_type,
			"branch_code": self.branch,
			"customer_name": self.customer,
			"mobile_number": self.mobile_number,
			"gender": self.gender,
			"date_of_birth": self.date_of_birth,
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


@frappe.whitelist()
def get_workspace_loan_requests(status_filter=None, search_text=None):
	user = frappe.session.user
	user_roles = set(frappe.get_roles(user))
	is_admin = bool({"System Manager", "Administrator"}.intersection(user_roles))
	is_credit_user = "Credit Loan User" in user_roles
	is_branch_user = "Branch Loan User" in user_roles or "Branch Manager" in user_roles

	if not (is_admin or is_credit_user or is_branch_user):
		return {"counts": {}, "requests": []}

	conditions = []
	values = {}

	# Role-based filtering
	if is_branch_user and not (is_credit_user or is_admin):
		user_sol_id = frappe.db.get_value("Employee", {"user_id": user}, "sol_id")
		if user_sol_id:
			conditions.append("(req.owner = %(user)s OR req.branch = %(branch)s)")
			values["user"] = user
			values["branch"] = user_sol_id
		else:
			conditions.append("req.owner = %(user)s")
			values["user"] = user

	where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

	# Calculate summary counts for cards
	counts_query = f"""
		SELECT
			COUNT(*) AS `all`,
			COUNT(CASE WHEN req.status = 'Pending Credit Review' THEN 1 END) AS `pending_review`,
			COUNT(CASE WHEN req.status = 'Approved' THEN 1 END) AS `approved`,
			COUNT(CASE WHEN req.status = 'Approved' AND (
				(req.loan_application IS NULL OR req.loan_application = '')
				AND NOT EXISTS (
					SELECT 1 FROM `tabLoan Application` la 
					WHERE la.loan_request = req.name AND la.docstatus != 2
				)
			) THEN 1 END) AS `approved_pending_app`,
			COUNT(CASE WHEN req.status = 'Approved' AND (
				(req.loan_application IS NOT NULL AND req.loan_application != '')
				OR EXISTS (
					SELECT 1 FROM `tabLoan Application` la 
					WHERE la.loan_request = req.name AND la.docstatus != 2
				)
			) THEN 1 END) AS `application_created`,
			COUNT(CASE WHEN req.status = 'Rejected' THEN 1 END) AS `rejected`,
			COUNT(CASE WHEN req.status = 'Sent Back' THEN 1 END) AS `sent_back`,
			COUNT(CASE WHEN req.status = 'Draft' THEN 1 END) AS `draft`
		FROM `tabLoan Request` req
		{where_clause}
	"""
	counts_res = frappe.db.sql(counts_query, values, as_dict=True)
	counts = counts_res[0] if counts_res else {}

	# List filtering
	list_conditions = list(conditions)
	list_values = dict(values)

	if status_filter and status_filter != "All":
		if status_filter == "Pending Credit Review":
			list_conditions.append("req.status = 'Pending Credit Review'")
		elif status_filter == "Approved":
			list_conditions.append("req.status = 'Approved'")
		elif status_filter in ("Approved (App Pending)", "Approved Pending App"):
			list_conditions.append("""
				req.status = 'Approved' AND (
					(req.loan_application IS NULL OR req.loan_application = '')
					AND NOT EXISTS (
						SELECT 1 FROM `tabLoan Application` la 
						WHERE la.loan_request = req.name AND la.docstatus != 2
					)
				)
			""")
		elif status_filter in ("Application Created", "Approved (App Created)"):
			list_conditions.append("""
				req.status = 'Approved' AND (
					(req.loan_application IS NOT NULL AND req.loan_application != '')
					OR EXISTS (
						SELECT 1 FROM `tabLoan Application` la 
						WHERE la.loan_request = req.name AND la.docstatus != 2
					)
				)
			""")
		elif status_filter in ("Rejected", "Sent Back", "Draft"):
			list_conditions.append("req.status = %(status_filter)s")
			list_values["status_filter"] = status_filter

	if search_text:
		list_conditions.append("""
			(req.name LIKE %(search)s 
			 OR req.customer LIKE %(search)s 
			 OR req.mobile_number LIKE %(search)s 
			 OR req.branch LIKE %(search)s 
			 OR req.loan_type LIKE %(search)s)
		""")
		list_values["search"] = f"%{search_text}%"

	list_where = f"WHERE {' AND '.join(list_conditions)}" if list_conditions else ""

	list_query = f"""
		SELECT 
			req.name,
			req.customer,
			req.mobile_number,
			req.branch,
			b.branch AS branch_name,
			req.loan_type,
			req.required_loan_amount,
			req.approved_loan_amount,
			req.status,
			req.modified,
			COALESCE(
				NULLIF(req.loan_application, ''),
				(SELECT la.name FROM `tabLoan Application` la WHERE la.loan_request = req.name AND la.docstatus != 2 LIMIT 1)
			) AS loan_application
		FROM `tabLoan Request` req
		LEFT JOIN `tabSahayog Branch` b ON b.name = req.branch
		{list_where}
		ORDER BY req.modified DESC
		LIMIT 100
	"""
	requests = frappe.db.sql(list_query, list_values, as_dict=True)

	return {
		"counts": counts,
		"requests": requests
	}
