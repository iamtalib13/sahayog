import frappe


def execute():
    frappe.db.sql("""
        UPDATE `tabEmployee`
        SET sahayog_branch = sol_id
        WHERE IFNULL(sol_id, '') != ''
    """)
