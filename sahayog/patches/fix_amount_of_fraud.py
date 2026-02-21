import frappe

def execute():
    if frappe.db.table_exists("Unauthorized Absence"):
        frappe.db.sql("""
            UPDATE `tabUnauthorized Absence`
            SET amount_of_fraud = 0
            WHERE amount_of_fraud IS NULL
               OR amount_of_fraud = ''
               OR amount_of_fraud NOT REGEXP '^[0-9]+(\\.[0-9]+)?$'
        """)