import frappe

def execute(filters=None):
    filters = filters or {}
    columns = get_columns()
    data = get_data(filters)
    return columns, data

# -----------------------------
# REPORT COLUMNS
# -----------------------------
def get_columns():
    return [
        {"label": "Asset", "fieldname": "asset", "fieldtype": "Link", "options": "Asset", "width": 150},
        {"label": "Key Type", "fieldname": "key_type", "fieldtype": "Data", "width": 140},
        {"label": "Key (Masked)", "fieldname": "masked_key", "fieldtype": "Data", "width": 200},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "Data", "width": 200},
        {"label": "Created By", "fieldname": "owner", "fieldtype": "Link", "options": "User", "width": 150},
        {"label": "Created On", "fieldname": "creation", "fieldtype": "Datetime", "width": 160}
    ]

# -----------------------------
# MASKING FUNCTION
# -----------------------------
def mask_key(key):
    """Mask key for security. Shows only first 4 and last 2 characters."""
    if not key:
        return ""
    if len(key) <= 6:
        return "*" * len(key)
    return key[:4] + "*" * (len(key) - 6) + key[-2:]

# -----------------------------
# GET DATA WITH FILTERS
# -----------------------------
def get_data(filters):
    conditions = {}

    # Apply filters
    if filters.get("asset"):
        conditions["asset"] = filters["asset"]

    if filters.get("key_type"):
        conditions["key_type"] = filters["key_type"]

    # Build query manually for date range
    query = """
        SELECT asset, key_type, `key`, remarks, owner, creation
        FROM `tabAsset Key`
        WHERE 1=1
    """

    if conditions.get("asset"):
        query += " AND asset = %(asset)s"
    if conditions.get("key_type"):
        query += " AND key_type = %(key_type)s"

    # Date filter
    if filters.get("from_date"):
        query += " AND DATE(creation) >= %(from_date)s"
    if filters.get("to_date"):
        query += " AND DATE(creation) <= %(to_date)s"

    query += " ORDER BY creation DESC"

    records = frappe.db.sql(query, conditions | filters, as_dict=True)

    # Mask the keys
    for r in records:
        r["masked_key"] = mask_key(r.get("key"))

    return records
