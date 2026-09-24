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


# =========================================================
# Custom Whitelisted Methods for Document Renaming
# =========================================================

@frappe.whitelist()
def rename_function_doc(old_name, new_name):
    if old_name == new_name:
        return
    
    # 1. Primary key rename
    frappe.rename_doc("Function", old_name, new_name, force=True)
    
    # 2. Inner field update
    frappe.db.set_value("Function", new_name, "function", new_name)
    
    # 3. Linked tables update
    frappe.db.sql("UPDATE `tabParameter` SET `function` = %s WHERE `function` = %s", (new_name, old_name))
    frappe.db.sql("UPDATE `tabBranch Score Card Item` SET `function` = %s WHERE `function` = %s", (new_name, old_name))
    
    frappe.db.commit()
    frappe.clear_cache(doctype="Function")
    frappe.clear_cache(doctype="Branch Score Card Settings")

@frappe.whitelist()
def rename_parameter_doc(old_name, new_name):
    if old_name == new_name:
        return
    
    # 1. Primary key rename
    frappe.rename_doc("Parameter", old_name, new_name, force=True)
    
    # 2. Inner field update
    frappe.db.set_value("Parameter", new_name, "parameter", new_name)
    
    # 3. Linked tables update
    frappe.db.sql("UPDATE `tabBranch Score Card Item` SET `parameter` = %s WHERE `parameter` = %s", (new_name, old_name))
    
    frappe.db.commit()
    frappe.clear_cache(doctype="Parameter")
    frappe.clear_cache(doctype="Branch Score Card Settings")