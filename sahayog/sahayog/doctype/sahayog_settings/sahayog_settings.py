# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import cint
from frappe.model.document import Document


class SahayogSettings(Document):
	def validate(self):
		if self.enable_mandatory_password_reset:
			reset_day = cint(self.mandatory_reset_day_of_month)
			if reset_day < 1 or reset_day > 28:
				frappe.throw(
					_("Monthly Reset Day must be between 1 and 28 (to ensure safe recurring reset across all months)."),
					title=_("Invalid Reset Day")
				)
