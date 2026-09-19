# Copyright (c) 2026, Sahayog and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class BranchVisitTemplateItem(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		category: DF.Data
		is_mandatory: DF.Check
		parameter_name: DF.Data
		response_type: DF.Literal["", "Text Observation", "Rating (1 to 5)", "Yes / No", "Number"]

	# end: auto-generated types
	pass