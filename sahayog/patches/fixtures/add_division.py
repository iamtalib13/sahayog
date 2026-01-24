import frappe


def execute():
    """
    Create default Divisions (ALL CAPS).
    Safe to run multiple times.
    """

    divisions_to_create = [
        "SCHOOL",
        "TWO WHEELER",
        "MICROFINANCE",
        "MULTISTATE",
        "JLL",
        "RETAIL BRANCH BANKING",
        "HEAD OFFICE",
    ]

    for division_name in divisions_to_create:
        try:
            # Check by document name
            if frappe.db.exists("Division", division_name):
                continue

            division_doc = frappe.new_doc("Division")
            division_doc.division = division_name  # adjust if fieldname differs
            division_doc.insert(ignore_permissions=True)

        except Exception:
            frappe.log_error(
                message=frappe.get_traceback(),
                title=f"Division Patch Failed: {division_name}",
            )

    frappe.db.commit()
