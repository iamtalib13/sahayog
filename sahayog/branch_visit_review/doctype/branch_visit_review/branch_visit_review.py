# Copyright (c) 2026, Sahayog and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from sahayog.branch_visit_review.api import (
	can_edit_visit_details,
	can_sign_branch_head,
	can_sign_visitor,
)

VISIT_DETAILS_FIELDS = (
	"branch",
	"branch_code",
	"region",
	"zone",
	"visit_date",
	"visited_by",
	"branch_head",
	"visit_duration",
	"template",
)


class BranchVisitReview(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		action_items: DF.Table[BranchVisitActionItem]
		areas_requiring_attention: DF.Data | None
		branch: DF.Link
		branch_code: DF.Data | None
		branch_head: DF.Data | None
		branch_head_signoff: DF.Check
		branch_head_signed_at: DF.Datetime | None
		key_strengths: DF.Data | None
		leadership_remarks: DF.Text | None
		overall_assessment: DF.Literal["", "Excellent", "Good", "Satisfactory", "Needs Improvement"]
		region_zone: DF.Data | None
		responses: DF.Table[BranchVisitResponse]
		template: DF.Link | None
		visit_date: DF.Date | None
		visit_duration: DF.Literal["", "Full Day", "Half Day"]
		visited_by: DF.Link | None
		visitor_signoff: DF.Check
		visitor_signed_at: DF.Datetime | None

	# end: auto-generated types

	def validate(self):
		self.validate_visit_details_edit()
		self.validate_visitor_signoff()
		self.validate_branch_head_signoff()

	def validate_visit_details_edit(self):
		if not self.get_doc_before_save() or frappe.session.user == "Administrator":
			return

		if not any(self.has_value_changed(field) for field in VISIT_DETAILS_FIELDS):
			return

		if not can_edit_visit_details(self.visited_by):
			frappe.throw(
				_("Only the visitor (Visited By), Cluster Head, Regional Head (RH) or Zonal Head (ZH) can edit visit details."),
				frappe.PermissionError,
			)

	def validate_visitor_signoff(self):
		self._validate_signoff(
			"visitor_signoff",
			"visitor_signed_at",
			self.is_visitor_user,
			"Only the visitor (Visited By) or Administrator can check Visitor Sign-Off.",
		)

	def validate_branch_head_signoff(self):
		self._validate_signoff(
			"branch_head_signoff",
			"branch_head_signed_at",
			self.is_branch_head_user,
			"Only the branch manager of this branch or Administrator can check Branch Head Sign-Off.",
		)

	def _validate_signoff(self, flag_field, time_field, is_allowed, message):
		if not self.has_value_changed(flag_field):
			return

		if not self.get(flag_field):
			self.set(time_field, None)
			return

		if not is_allowed():
			frappe.throw(_(message), frappe.PermissionError)

		self.set(time_field, now_datetime())

	def is_visitor_user(self) -> bool:
		return can_sign_visitor(self.visited_by)

	def is_branch_head_user(self) -> bool:
		return can_sign_branch_head(self.branch)