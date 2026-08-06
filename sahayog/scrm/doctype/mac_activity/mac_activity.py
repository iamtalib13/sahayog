# -*- coding: utf-8 -*-
# Copyright (c) 2026, Administrator and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class MACActivity(Document):
	def validate(self):
		if self.status == "Cancelled" and not self.remark:
			frappe.throw(_("Remark is mandatory if Status is Cancelled"))
		
		# If Unpaid, reset Estimated Cost to 0
		if self.paid_unpaid == "Unpaid":
			self.estimated_cost = 0

@frappe.whitelist()
def get_dashboard_data():
	user = frappe.session.user
	is_admin = "System Manager" in frappe.get_roles(user) or user == "Administrator"

	filters = {}
	if not is_admin:
		filters["owner"] = user

	records = frappe.get_all(
		"MAC Activity",
		filters=filters,
		fields=["name", "date", "branch_name", "product_focus", "estimated_cost", "units_accounts", "status", "creation"],
		order_by="creation desc",
		limit=50
	)

	# Stats count
	total_activities = len(records)
	total_cost = sum(float(r.estimated_cost or 0) for r in records)
	total_units = sum(int(r.units_accounts or 0) for r in records)
	done_count = sum(1 for r in records if r.status == "Done")
	cancelled_count = sum(1 for r in records if r.status == "Cancelled")

	return {
		"records": records,
		"stats": {
			"total_activities": total_activities,
			"total_cost": total_cost,
			"total_units": total_units,
			"done_count": done_count,
			"cancelled_count": cancelled_count
		},
		"is_admin": is_admin
	}

@frappe.whitelist(allow_guest=True)
def get_branch_details(branch):
	if not branch:
		return {}
	branch_doc = frappe.get_doc("Sahayog Branch", branch)
	return {
		"branch": branch_doc.branch,
		"branch_code": branch_doc.branch_code or branch_doc.sol_id,
		"zone": branch_doc.zone,
		"region": branch_doc.region
	}

@frappe.whitelist(allow_guest=True)
def get_employee_details(employee):
	if not employee:
		return {}
	emp = frappe.get_doc("Employee", employee)
	branch_details = {}
	if emp.sahayog_branch:
		branch_details = get_branch_details(emp.sahayog_branch)
	return {
		"employee_id": emp.name,
		"employee_name": emp.employee_name,
		"sahayog_branch": emp.sahayog_branch,
		"branch_details": branch_details
	}

@frappe.whitelist()
def get_logged_in_employee_details():
	user = frappe.session.user
	if user == "Administrator":
		return {}
	employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if not employee:
		return {}
	return get_employee_details(employee)











