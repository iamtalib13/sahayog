import frappe


def execute():
    """
    Create default Zones (ALL CAPS).
    Safe to run multiple times.
    """

    zones_to_create = [
        "ZONE-1",
        "ZONE-2",
        "ZONE-3",
        "ZONE-4",
        "ZONE-5",
        "ZONE-6",
    ]

    for zone_name in zones_to_create:
        try:
            # Check by document name
            if frappe.db.exists("Zone", zone_name):
                continue

            zone_doc = frappe.new_doc("Zone")
            zone_doc.zone = zone_name  # adjust if fieldname differs
            zone_doc.insert(ignore_permissions=True)

        except Exception:
            frappe.log_error(
                message=frappe.get_traceback(),
                title=f"Zone Patch Failed: {zone_name}",
            )

    frappe.db.commit()
