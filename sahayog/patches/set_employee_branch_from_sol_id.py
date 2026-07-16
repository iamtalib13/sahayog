import frappe


def execute():
    frappe.db.sql("""
        UPDATE `tabEmployee` e
        INNER JOIN `tabSahayog Branch` sb ON TRIM(e.sol_id) = CAST(sb.name AS CHAR)
        SET e.branch = sb.branch
        WHERE e.custom_is_support_staff = 1
        AND IFNULL(e.sol_id, '') != ''
        AND (IFNULL(e.branch, '') = '' OR e.branch = '')
    """)
