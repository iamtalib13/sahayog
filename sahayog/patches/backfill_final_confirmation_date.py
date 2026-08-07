import frappe
from frappe.utils import add_days


def execute():
    """Backfill final_confirmation_date = date_of_joining + 90 days.

    Only touches Active support-staff employees whose final_confirmation_date
    is not set. Idempotent — safe to run repeatedly.
    """
    employees = frappe.get_all(
        "Employee",
        filters={
            "status": "Active",
            "custom_is_support_staff": 1,
            "final_confirmation_date": ["is", "not set"],
        },
        fields=["name", "employee_name", "date_of_joining"],
    )

    updated = 0
    skipped = 0
    for e in employees:
        if not e.date_of_joining:
            print(f"SKIPPED (no DOJ): {e.employee_name} ({e.name})")
            skipped += 1
            continue
        frappe.db.set_value(
            "Employee",
            e.name,
            "final_confirmation_date",
            add_days(e.date_of_joining, 90),
            update_modified=False,
        )
        updated += 1

    frappe.db.commit()
    print(f"Updated {updated} employee(s), skipped {skipped} without DOJ.")
