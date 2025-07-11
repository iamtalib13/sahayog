import frappe

def custom_asset_autoname(doc, method):
    if not doc.location:
        frappe.throw("Location is required to generate Asset name.")
    if not doc.asset_category:
        frappe.throw("Asset Category is required to generate Asset name.")

    # Clean + uppercase both fields
    location_code = doc.location.strip().upper()
    category_code = doc.asset_category.strip().upper()

    # Prefix format: LOCATION-ASSETCATEGORY-
    prefix = f"{location_code}-{category_code}-"

    # Get last asset with the same prefix
    last = frappe.db.sql(
        """SELECT name FROM `tabAsset`
           WHERE name LIKE %s
           ORDER BY name DESC LIMIT 1""",
        (prefix + "%",),
    )

    if last:
        try:
            last_number = int(last[0][0].split("-")[-1])
        except ValueError:
            last_number = 0
    else:
        last_number = 0

    next_number = str(last_number + 1).zfill(4)
    doc.name = f"{prefix}{next_number}"
