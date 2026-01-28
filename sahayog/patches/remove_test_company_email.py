import frappe


def execute():
    """
    Remove dummy test email from Employee.company_email
    """

    frappe.db.sql("""
        UPDATE `tabEmployee`
        SET company_email = NULL
        WHERE company_email = 'Test@sahayogmultistate.com'
    """)

    frappe.db.commit()