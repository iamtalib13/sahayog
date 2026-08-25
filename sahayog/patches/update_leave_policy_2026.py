import frappe


def execute():
    """Align Leave Type config with Leave & Absenteeism Policy V4-2026 carry-forward rules."""
    updates = {
        # Casual Leave: carry forward, max 3 days (policy 3.7.1.2)
        "Casual Leave": {
            "is_carry_forward": 1,
            "maximum_carry_forwarded_leaves": 3,
        },
        # Sick Leave: carry forward, max 6 days (policy 3.7.2.2)
        "Sick Leave": {
            "is_carry_forward": 1,
            "maximum_carry_forwarded_leaves": 6,
        },
        # Earned Leave: carry forward, lapsing after 24 months (policy 3.7.3.2)
        "Earned Leave": {
            "is_carry_forward": 1,
            "maximum_carry_forwarded_leaves": 0,
            "expire_carry_forwarded_leaves_after_days": 730,
        },
    }

    for leave_type, fields in updates.items():
        if not frappe.db.exists("Leave Type", leave_type):
            print(f"Skipped: {leave_type} (does not exist)")
            continue
        doc = frappe.get_doc("Leave Type", leave_type)
        for field, value in fields.items():
            doc.set(field, value)
        doc.flags.ignore_validate = True
        doc.save(ignore_permissions=True)
        print(f"Updated: {leave_type} -> {fields}")

    frappe.db.commit()
