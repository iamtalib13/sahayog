import frappe


def execute():
    """
    Set Employee.petty_cash_branch as follows:

    1. Use sahayog_branch when available.
    2. Otherwise, use sol_id when available.
    3. If both are blank/NULL, do not update that Employee.
    """

    frappe.db.sql("""
        UPDATE `tabEmployee`
        SET petty_cash_branch = COALESCE(
            NULLIF(TRIM(sahayog_branch), ''),
            NULLIF(TRIM(sol_id), '')
        )
        WHERE COALESCE(
            NULLIF(TRIM(sahayog_branch), ''),
            NULLIF(TRIM(sol_id), '')
        ) IS NOT NULL
    """)

    updated_count = frappe.db.sql("""
        SELECT COUNT(*)
        FROM `tabEmployee`
        WHERE COALESCE(
            NULLIF(TRIM(sahayog_branch), ''),
            NULLIF(TRIM(sol_id), '')
        ) IS NOT NULL
          AND petty_cash_branch = COALESCE(
              NULLIF(TRIM(sahayog_branch), ''),
              NULLIF(TRIM(sol_id), '')
          )
    """)[0][0]

    frappe.logger("petty_cash_management").info(
        f"Employee petty_cash_branch sync completed. "
        f"Records synced: {updated_count}"
    )
