import frappe

def execute():
    """
    Copy sol_id value into sahayog_branch
    for all Employee records
    """

    frappe.db.sql("""
        UPDATE `tabEmployee`
        SET sahayog_branch = sol_id
        WHERE sol_id IS NOT NULL
          AND sol_id != ''
    """)

    frappe.db.commit()
