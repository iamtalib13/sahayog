import frappe


def execute():
    # Check if Custom Field already exists
    if frappe.db.exists(
        "Custom Field",
        {
            "dt": "Comment",
            "fieldname": "email_sent"
        }
    ):
        return

    # Create Custom Field
    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Comment",
        "label": "Email Sent",
        "fieldname": "email_sent",
        "fieldtype": "Check",
        "default": "0",
        "hidden": 1,
        "insert_after": "content"
    }).insert(ignore_permissions=True)

    # Backfill old records (important)
    frappe.db.sql("""
        UPDATE `tabComment`
        SET email_sent = 0
        WHERE email_sent IS NULL
    """)

    frappe.db.commit()
