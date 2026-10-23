"""
Patch: fix_loan_request_approved_amount_empty_strings
Cleans empty string values in approved_loan_amount before
migration alters the column from Data to Currency (decimal).
"""

import frappe


def execute():
	frappe.db.sql("""
		UPDATE `tabLoan Request`
		SET approved_loan_amount = 0
		WHERE approved_loan_amount = '' OR approved_loan_amount IS NULL
	""")
	frappe.db.commit()
