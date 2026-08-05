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










