# Copyright (c) 2026, Sahayog and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from sahayog.branch_visit_review.api import (
	VISIT_DETAILS_DESIGNATIONS,
	can_edit_visit_details,
	can_sign_branch_head,
	can_sign_visitor,
)

VISIT_DETAILS_FIELDS = (
	"branch",
	"branch_code",
	"district",
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
		district: DF.Data | None
		key_strengths: DF.Data | None
		leadership_remarks: DF.Text | None
		overall_assessment: DF.Literal["", "Excellent", "Good", "Average", "Satisfactory", "Needs Improvement"]
		region_zone: DF.Data | None
		responses: DF.Table[BranchVisitResponse]
		template: DF.Link | None
		visit_date: DF.Date | None
		visit_duration: DF.Literal["", "Full Day", "Half Day"]
		visited_by: DF.Link | None
		visitor_signoff: DF.Check
		visitor_name: DF.Data | None
		visitor_signed_at: DF.Datetime | None

	# end: auto-generated types

	def validate(self):
		self.set_district_from_sol_id()
		self.format_numbered_fields()
		# self.validate_visited_by_designation()
		# self.validate_visit_details_edit()
		self.validate_visitor_signoff()
		self.validate_branch_head_signoff()

	def format_numbered_fields(self):
		if self.key_strengths:
			self.key_strengths = self._number_lines(self.key_strengths)

	@staticmethod
	def _number_lines(text: str) -> str:
		import re
		lines = [line.strip() for line in text.split("\n") if line.strip()]
		cleaned = []
		for line in lines:
			clean = re.sub(r"^\d+\.\s*", "", line).strip()
			if clean:
				cleaned.append(clean)
		return "\n".join(f"{idx + 1}. {item}" for idx, item in enumerate(cleaned))

	def set_district_from_sol_id(self):
		if not self.district:
			if self.branch_code:
				self.district = frappe.db.get_value(
					"Sahayog Branch", {"sol_id": self.branch_code}, "district"
				)
			elif self.branch:
				self.district = frappe.db.get_value(
					"Sahayog Branch", self.branch, "district"
				)

	def validate_visited_by_designation(self):
		if not self.visited_by:
			return
		designation = frappe.db.get_value("Employee", self.visited_by, "designation")
		if designation not in VISIT_DETAILS_DESIGNATIONS:
			frappe.throw(
				_("Visited By must be a {0}.").format(
					", ".join(VISIT_DETAILS_DESIGNATIONS)
				),
				frappe.ValidationError,
			)

	def validate_visit_details_edit(self):
		if frappe.session.user == "Administrator":
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

	def on_update(self):
		self.create_sahayog_tickets_for_actions()

	def create_sahayog_tickets_for_actions(self):
		if not frappe.db.exists("DocType", "Sahayog Ticket"):
			return
		if not self.action_items:
			return

		for row in self.action_items:
			if not row.action_item or row.sahayog_ticket:
				continue
			if not row.responsible:
				continue

			try:
				employee = self._resolve_employee(row.responsible)
				if not employee:
					continue

				ticket_name = self._make_sahayog_ticket(row, employee)
				if ticket_name:
					frappe.db.set_value(row.doctype, row.name, "sahayog_ticket", ticket_name)
					row.sahayog_ticket = ticket_name
			except Exception:
				frappe.log_error(
					title="Sahayog Ticket creation failed for Branch Visit Review action item",
					message=frappe.get_traceback(),
				)

	def _resolve_employee(self, responsible):
		if frappe.db.exists("Employee", responsible):
			return responsible
		# try to extract id if stored as "Name (EMP-001)"
		if "(" in responsible and responsible.endswith(")"):
			candidate = responsible.rsplit("(", 1)[-1][:-1].strip()
			if candidate and frappe.db.exists("Employee", candidate):
				return candidate
		return frappe.db.get_value("Employee", {"employee_name": responsible}, "name")

	def _make_sahayog_ticket(self, row, employee):
		session_employee = frappe.db.get_value(
			"Employee", {"user_id": frappe.session.user}, "name"
		)

		dept_name = "Admin"
		ticket_type = "Branch Visit Review Queary"

		desc = row.action_item or ""
		desc += f"<br><br><b>Source:</b> Branch Visit Review {self.name}"
		if self.branch:
			desc += f"<br><b>Branch:</b> {self.branch}"

		priority_map = {"High": "High", "Medium": "Medium", "Low": "Normal"}
		priority = priority_map.get((row.priority or "").strip(), "Normal")

		ticket = frappe.get_doc(
			{
				"doctype": "Sahayog Ticket",
				"employee_id": session_employee,
				"assigned_to": frappe.session.user,
				"dept_name": dept_name,
				"ticket_type": ticket_type,
				"description": desc,
				"priority": priority,
				"status": "Open",
			}
		)
		ticket.insert(ignore_permissions=True)
		return ticket.name