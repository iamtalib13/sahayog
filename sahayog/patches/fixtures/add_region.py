import frappe


def execute():
    """
    Create default Regions (ALL CAPS).
    Safe to run multiple times.
    """

    regions_to_create = [
        "HEAD OFFICE",
        "REGION-1",
        "REGION-2",
        "REGION-3",
        "REGION-4",
        "REGION-5",
        "REGION-6",
    ]

    for region_name in regions_to_create:
        try:
            # Check by document name
            if frappe.db.exists("Region", region_name):
                continue

            region_doc = frappe.new_doc("Region")
            region_doc.region = region_name  # adjust if fieldname differs
            region_doc.insert(ignore_permissions=True)

        except Exception:
            frappe.log_error(
                message=frappe.get_traceback(),
                title=f"Region Patch Failed: {region_name}",
            )

    frappe.db.commit()
