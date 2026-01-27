import frappe

def create_asset_keys(doc, method=None):
    """
    Automatically create Asset Key records
    from Asset windows_key and office_key fields.
    """

    key_map = {
        "windows_key": "Windows",
        "office_key": "Office",
    }

    for asset_field, key_type in key_map.items():
        key_value = doc.get(asset_field)

        if not key_value:
            continue

        # Prevent duplicate creation
        exists = frappe.db.exists(
            "Asset Key",
            {
                "asset": doc.name,
                "key_type": key_type,
                "key": key_value,
            },
        )

        if exists:
            continue

        asset_key = frappe.new_doc("Asset Key")
        asset_key.asset = doc.name
        asset_key.key_type = key_type
        asset_key.key = key_value
        asset_key.remarks = f"Auto-created from Asset {doc.name}"
        asset_key.insert(ignore_permissions=True)
