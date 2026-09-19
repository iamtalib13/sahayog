# Copyright (c) 2026, Sahayog and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class BranchVisitTemplate(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		applicable_branch_type: DF.Data
		is_active: DF.Check
		items: DF.Table[BranchVisitTemplateItem]
		template_name: DF.Data

	# end: auto-generated types
	pass