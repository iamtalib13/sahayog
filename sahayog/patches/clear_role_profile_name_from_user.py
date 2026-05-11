import frappe


def execute():
    updated = frappe.db.sql("""
        UPDATE `tabUser`
        SET role_profile_name = ''
        WHERE IFNULL(role_profile_name, '') != ''
    """)

    frappe.db.commit()
