import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class BranchScoreCardSettings(Document):

    def validate(self):
        self.validate_score_card_settings()

    def validate_score_card_settings(self):
        """
        Comprehensive validation for Branch Score Card Settings
        (Scoring Methodology has no validation)
        """
        rows = self.get("score_card_settings", [])

        # 1. Table Empty Check
        if not rows:
            frappe.throw(
                _("Please add at least one row in <b>Score Card Settings</b> table."),
                title=_("Empty Table")
            )

        seen_parameters = set()

        for idx, row in enumerate(rows, start=1):
            row_label = f"Row #{idx}"

            # 2. Mandatory Function Check
            if not row.function:
                frappe.throw(
                    _("<b>{0}</b>: Function is required.").format(row_label),
                    title=_("Missing Field")
                )

            # 3. Mandatory Parameter Check
            if not row.parameter:
                frappe.throw(
                    _("<b>{0}</b>: Parameter is required.").format(row_label),
                    title=_("Missing Field")
                )

            # 4. Duplicate Parameter Check (Same Function + Parameter combination)
            param_key = (row.function, row.parameter)
            if param_key in seen_parameters:
                frappe.throw(
                    _("<b>{0}</b>: Parameter <b>'{1}'</b> is already added under Function <b>'{2}'</b>.").format(
                        row_label, row.parameter, row.function
                    ),
                    title=_("Duplicate Entry")
                )
            seen_parameters.add(param_key)

            # 5. Weightage Mandatory Check
            if row.weightage is None or row.weightage == "":
                frappe.throw(
                    _("<b>{0}</b>: Weightage is mandatory for Parameter: <b>{1}</b>").format(
                        row_label, row.parameter
                    ),
                    title=_("Missing Field")
                )

            # 6. Weightage Numeric & Positive Check
            weightage = flt(row.weightage)
            if weightage <= 0:
                frappe.throw(
                    _("<b>{0}</b>: Weightage must be greater than 0 for Parameter: <b>{1}</b>").format(
                        row_label, row.parameter
                    ),
                    title=_("Invalid Weightage")
                )

            # 7. Scoring Rule Mandatory Check (Spaces/Blank disallowed)
            rule = (row.scoring_rule or "").strip()
            if not rule:
                frappe.throw(
                    _("<b>{0}</b>: <b>Scoring Rule</b> is mandatory for Parameter: <b>{1}</b>.").format(
                        row_label, row.parameter
                    ),
                    title=_("Missing Scoring Rule")
                )

            if len(rule) < 3:
                frappe.throw(
                    _("<b>{0}</b>: <b>Scoring Rule</b> for Parameter <b>'{1}'</b> is too short. Please enter a valid rule description.").format(
                        row_label, row.parameter
                    ),
                    title=_("Invalid Scoring Rule")
                )