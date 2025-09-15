import frappe

# "sahayog.procurement.api.purchase_receipt.get_available_qty"

@frappe.whitelist()
def get_available_qty(item_code=None, warehouse=None):
    """
    Get available quantity warehouse-wise.
    If item_code is given -> return stock of that item in all warehouses (or specific warehouse).
    If no item_code -> return stock of all items in all warehouses.
    """

    filters = {}
    if item_code:
        filters["item_code"] = item_code
    if warehouse:
        filters["warehouse"] = warehouse

    bins = frappe.get_all(
        "Bin",
        fields=["item_code", "warehouse", "actual_qty", "reserved_qty", "projected_qty"],
        filters=filters
    )

    return bins
