# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate


class BranchScoreCard(Document):

	def before_save(self):
		"""Auto-populate month and year from date field."""
		if self.date:
			d = getdate(self.date)
			self.month = d.month
			self.year = d.year

	def validate(self):
		self.validate_one_record_per_branch_per_month()

	def validate_one_record_per_branch_per_month(self):
		"""
		Ensure only ONE Branch Score Card exists per Branch per calendar month.
		A branch can have at most 12 records per year (one per month).
		"""
		if not self.branch or not self.date:
			return

		d = getdate(self.date)
		month = d.month
		year  = d.year

		filters = {
			"branch": self.branch,
			"month":  month,
			"year":   year,
		}

		# Exclude current document when editing
		if not self.is_new():
			filters["name"] = ("!=", self.name)

		existing = frappe.db.get_value(
			"Branch Score Card",
			filters,
			["name", "date"],
			as_dict=True,
		)

		if existing:
			month_name = d.strftime("%B")   # e.g. "July"
			frappe.throw(
				_(
					"A Branch Score Card for <b>{branch}</b> already exists for "
					"<b>{month} {year}</b> (Record: {link}).<br><br>"
					"Only one record per branch per month is allowed."
				).format(
					branch=self.branch,
					month=month_name,
					year=year,
					link=frappe.utils.get_link_to_form(
						"Branch Score Card", existing.name
					),
				),
				title=_("Duplicate Record"),
			)
