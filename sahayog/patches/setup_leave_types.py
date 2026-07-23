import frappe


def execute():
    # ── Fix existing Leave Types ──
    fixes = {
        "Casual Leave": {
            "max_leaves_allowed": 0,
            "earned_leave_frequency": None,
            "allocate_on_day": None,
        },
        "Sick Leave": {
            "max_leaves_allowed": 0,
            "earned_leave_frequency": None,
            "allocate_on_day": None,
        },
        "Earned Leave": {
            "max_leaves_allowed": 0,
        },
    }

    for leave_type, fields in fixes.items():
        if frappe.db.exists("Leave Type", leave_type):
            doc = frappe.get_doc("Leave Type", leave_type)
            for field, value in fields.items():
                doc.set(field, value)
            doc.flags.ignore_validate = True
            doc.save(ignore_permissions=True)
            print(f"Fixed: {leave_type}")

    # ── Create missing Leave Types ──
    new_types = [
        {
            "leave_type_name": "Paternity Leave",
            "max_leaves_allowed": 2,
            "max_continuous_days_allowed": 2,
            "is_carry_forward": 0,
            "allow_negative": 0,
        },
        {
            "leave_type_name": "Maternity Leave",
            "max_continuous_days_allowed": 180,
            "is_carry_forward": 0,
            "allow_negative": 0,
        },
        {
            "leave_type_name": "Compensatory Off",
            "is_compensatory": 1,
            "max_leaves_allowed": 30,
            "is_carry_forward": 0,
            "allow_negative": 0,
            "max_continuous_days_allowed": 30,
        },
    ]

    for lt in new_types:
        name = lt["leave_type_name"]
        if not frappe.db.exists("Leave Type", name):
            doc = frappe.get_doc({"doctype": "Leave Type", **lt})
            doc.flags.ignore_validate = True
            doc.insert(ignore_permissions=True)
            print(f"Created: {name}")
        else:
            print(f"Skipped: {name} (already exists)")
