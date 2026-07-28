import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, get_first_day, get_last_day


class BranchScoreCard(Document):

	def validate(self):
		self.set_title()
		self.validate_one_record_per_branch_per_month()

	def set_title(self):
		if self.branch and self.date:
			d = getdate(self.date)
			month = d.strftime("%B")
			self.branch_name = f"{self.branch} - {month} {d.year}"

	def validate_one_record_per_branch_per_month(self):
		if not self.branch or not self.date:
			return

		d = getdate(self.date)
		filters = {
			"branch": self.branch,
			"date": ["between", [get_first_day(d), get_last_day(d)]],
		}

		if not self.is_new():
			filters["name"] = ["!=", self.name]

		if frappe.db.exists("Branch Score Card", filters):
			frappe.throw(
				_("A Branch Score Card for <b>{branch}</b> already exists for <b>{month} {year}</b>. Only one record per branch per month is allowed.").format(
					branch=self.branch,
					month=d.strftime("%B"),
					year=d.year,
				),
				title=_("Duplicate Record"),
			)