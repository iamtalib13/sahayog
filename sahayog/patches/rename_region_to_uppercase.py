import frappe


def execute():
    """
    Rename Region doctype records where name contains mixed-case 'Region'/'region'
    to standard uppercase format (e.g., 'Region-1' -> 'REGION-1').
    Uses frappe.rename_doc to safely update all linked records across doctypes.
    """
    regions = frappe.db.get_all("Region", fields=["name", "region"])

    for r in regions:
        name = r.get("name") or ""
        if not name:
            continue

        lower_name = name.lower()
        if "region" in lower_name:
            # Replace 'region' or 'Region' prefix/substring with 'REGION'
            clean = name.replace(" ", "")
            parts = clean.split("-") if "-" in clean else [clean[:6], clean[6:]]

            if len(parts) >= 2:
                prefix = parts[0].upper()
                suffix = "-".join(parts[1:]).upper()
                new_name = f"{prefix}-{suffix}"
            else:
                new_name = clean.upper()

            if not new_name.startswith("REGION-") and new_name.startswith("REGION"):
                new_name = "REGION-" + new_name[6:].lstrip("-")

            if name != new_name:
                if not frappe.db.exists("Region", new_name):
                    frappe.rename_doc("Region", name, new_name, force=True)
                    frappe.db.set_value("Region", new_name, "region", new_name)
                else:
                    frappe.db.set_value("Region", name, "region", new_name)

    frappe.db.commit()
