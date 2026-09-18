# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


def _approval_system_enabled():
	try:
		return bool(frappe.db.get_single_value("Sahayog Settings", "enable_approval_system"))
	except Exception:
		return True


class ApprovalCategory(Document):
	def validate(self):
		if not _approval_system_enabled():
			frappe.throw("Approval System is OFF. Please enable it from Sahayog Settings.")


def get_permission_query_conditions(user=None):
	if not _approval_system_enabled():
		return "1=0"
	return ""


def has_permission(doc, ptype="read", user=None):
	if not _approval_system_enabled():
		return False
	return True
