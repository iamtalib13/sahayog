# Copyright (c) 2026, Sahayog and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class BranchVisitResponse(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		attachment: DF.Attach | None
		category: DF.Data | None
		observation: DF.Data | None
		parameter_name: DF.Data | None
		rating_score: DF.Data | None
		response_type: DF.Literal["", "Text Observation", "Rating (1 to 5)", "Yes / No", "Number"]

	# end: auto-generated types
	pass