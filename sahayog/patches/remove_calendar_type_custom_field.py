import frappe


def execute():
    if frappe.db.exists("Custom Field", "Meeting-calendar_type"):
        frappe.delete_doc("Custom Field", "Meeting-calendar_type", ignore_permissions=True)
        frappe.db.commit()
        print("Done: Removed Custom Field Meeting-calendar_type (now part of meeting.json).")
    else:
        print("Custom Field Meeting-calendar_type not found. Skipping.")
