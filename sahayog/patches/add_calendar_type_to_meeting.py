import frappe


def execute():
    """
    Add `calendar_type` custom field to Meeting doctype.
    Options: SS Training | Employee Training
    - Trainer / Trainer Head role users → create SS Training events
    - L&D / HR users → create Employee Training events
    The Calendar tab in Trainer Dashboard auto-filters by viewer's role.
    """
    if frappe.db.exists("Custom Field", "Meeting-calendar_type"):
        print("Custom field Meeting-calendar_type already exists. Skipping.")
        return

    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Meeting",
        "fieldname": "calendar_type",
        "fieldtype": "Select",
        "label": "Calendar Type",
        "options": "\nSS Training\nEmployee Training",
        "insert_after": "topic",
        "in_list_view": 1,
        "in_standard_filter": 1,
        "reqd": 0,
        "default": "SS Training",
        "description": "Determines which calendar this event appears on. SS Training = Trainer Dashboard Calendar. Employee Training = Employee Training Calendar.",
    }).insert(ignore_permissions=True)

    frappe.db.commit()
    print("Done: calendar_type field added to Meeting doctype.")
