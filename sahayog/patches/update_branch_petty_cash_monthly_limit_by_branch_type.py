import frappe


def execute():
    updated = 0

    records = frappe.get_all(
        "Branch Petty Cash Account",
        fields=["name", "branch", "branch_type", "monthly_limit"]
    )

    for row in records:
        new_limit = None

        if row.branch_type == "Metro":
            new_limit = 30000
        elif row.branch_type == "Non Metro":
            new_limit = 25000

        if new_limit is None:
            continue

        if row.monthly_limit != new_limit:
            frappe.db.set_value(
                "Branch Petty Cash Account",
                row.name,
                "monthly_limit",
                new_limit,
                update_modified=False
            )
            updated += 1

    frappe.db.commit()
    frappe.log_error(
        title="Branch Petty Cash Account Monthly Limit Patch",
        message=f"Updated {updated} records."
    )
