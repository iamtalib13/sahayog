"""
Patch: fix_loan_request_approved_amount_empty_strings
Cleans non-numeric and empty string values (such as 'NA', '', NULL) in
Loan Request amount fields before migration alters columns to Decimal/Currency.
"""

import frappe


def execute():
	fields = ["approved_loan_amount", "required_loan_amount", "deposit_amount"]
	for field in fields:
		if not frappe.db.has_column("Loan Request", field):
			continue

		col_type = frappe.db.sql(f"""
			SELECT DATA_TYPE 
			FROM INFORMATION_SCHEMA.COLUMNS 
			WHERE TABLE_SCHEMA = DATABASE() 
			  AND TABLE_NAME = 'tabLoan Request' 
			  AND COLUMN_NAME = '{field}'
		""")

		if col_type and col_type[0][0] in ("varchar", "text", "char"):
			frappe.db.sql(f"""
				UPDATE `tabLoan Request`
				SET `{field}` = '0'
				WHERE `{field}` IS NULL
				   OR `{field}` = ''
				   OR `{field}` = 'NA'
				   OR `{field}` = 'N/A'
				   OR `{field}` = 'None'
				   OR `{field}` = 'null'
				   OR `{field}` NOT REGEXP '^[0-9]+(\\\\.[0-9]+)?$'
			""")
		else:
			frappe.db.sql(f"""
				UPDATE `tabLoan Request`
				SET `{field}` = 0
				WHERE `{field}` IS NULL
			""")

	frappe.db.commit()
