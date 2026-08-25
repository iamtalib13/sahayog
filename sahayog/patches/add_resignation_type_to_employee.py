import frappe


def execute():
    """Add Resignation Type (Voluntary/Involuntary) field to Employee doctype."""
    if frappe.db.exists("Custom Field", {"dt": "Employee", "fieldname": "custom_resignation_type"}):
        return

    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Employee",
        "fieldname": "custom_resignation_type",
        "fieldtype": "Select",
        "label": "Resignation Type",
        "options": "\nVoluntary\nInvoluntary",
        "insert_after": "reason_for_leaving",
        "depends_on": "eval:doc.status=='Left'",
    }).insert(ignore_permissions=True)
    frappe.db.commit()