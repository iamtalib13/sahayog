# Copyright (c) 2026, Sahayog and contributors
# For license information, please see license.txt

from frappe.model.document import Document


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
	pass