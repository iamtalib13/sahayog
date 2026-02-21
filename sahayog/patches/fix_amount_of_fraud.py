import frappe

def execute():
    if frappe.db.table_exists("Unauthorized Absence"):
        # First set NULL values to 0
        frappe.db.sql("""
            UPDATE `tabUnauthorized Absence`
            SET amount_of_fraud = 0
            WHERE amount_of_fraud IS NULL
        """)

        # Force convert any invalid values safely
        frappe.db.sql("""
            UPDATE `tabUnauthorized Absence`
            SET amount_of_fraud = 0
            WHERE amount_of_fraud + 0 IS NULL
        """)