import frappe

# sahayog.procurement.api.purchase_receipt.get_available_qty"

@frappe.whitelist()
def get_available_qty(item_code=None, warehouse=None):
    """
    Get available quantity warehouse-wise, including Item Name.
    If item_code is given -> return stock of that item in all warehouses (or specific warehouse).
    If no item_code -> return stock of all items in all warehouses.
    """

    conditions = []
    values = {}

    if item_code:
        conditions.append("bin.item_code = %(item_code)s")
        values["item_code"] = item_code
    if warehouse:
        conditions.append("bin.warehouse = %(warehouse)s")
        values["warehouse"] = warehouse

    condition_str = " AND ".join(conditions) if conditions else "1=1"

    bins = frappe.db.sql("""
        SELECT 
            bin.item_code,
            item.item_name,
            bin.warehouse,
            bin.actual_qty,
            bin.reserved_qty,
            bin.projected_qty
        FROM `tabBin` bin
        LEFT JOIN `tabItem` item ON item.name = bin.item_code
        WHERE {condition_str}
    """.format(condition_str=condition_str), values, as_dict=1)

    return bins

# sahayog.procurement.api.purchase_receipt.get_user_warehouse
@frappe.whitelist()
def get_user_warehouse(user=None):
    """Return warehouse for the given user from Sahayog Settings child table"""

    if not user:
        user = frappe.session.user  # logged-in user email like 8466@gmail.com

    # Fetch settings (Single Doctype)
    settings = frappe.get_single("Sahayog Settings")

    # Loop through correct child table fieldname
    for row in settings.wh_dept_map:
        if row.user_id == user:
            return {
                "warehouse": row.warehouse,
                # "item_department": row.item_department
            }

    return {
        "warehouse": None,
        "message": f"No warehouse assigned for user {user}"
    }
