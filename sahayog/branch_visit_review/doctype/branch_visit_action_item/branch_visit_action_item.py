# Copyright (c) 2026, Sahayog and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class BranchVisitActionItem(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		action_item: DF.Data | None
		priority: DF.Literal["", "High", "Medium", "Low"]
		proof: DF.Attach | None
		resolution_notes: DF.Data | None
		responsible: DF.Data | None
		sahayog_ticket: DF.Link | None
		stage_2_tat: DF.Date | None
		stage_3_tat: DF.Date | None
		stage_4_tat: DF.Date | None
		status: DF.Literal["Open", "In Progress", "Resolved"]
		tat: DF.Date | None

	# end: auto-generated types
	pass