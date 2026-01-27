

import frappe

def execute(filters=None):
    columns = [
        dict(fieldname="item_code", label="Item Code", fieldtype="Link", options="Item", width=150),
        dict(fieldname="item_name", label="Item Name", fieldtype="Data", width=200),
        dict(fieldname="warehouse", label="Warehouse", fieldtype="Link", options="Warehouse", width=150),
        dict(fieldname="stock_balance", label="Stock Balance", fieldtype="Float", width=120),
        dict(fieldname="select_row", label="Select Items", fieldtype="Data", width=60),
    ]

    query = """
        SELECT
            bin.item_code,
            item.item_name,
            bin.warehouse,
            SUM(bin.actual_qty) AS stock_balance,
            '' AS select_row
        FROM `tabBin` bin
        LEFT JOIN `tabItem` item ON bin.item_code = item.name
        WHERE bin.warehouse = %(warehouse)s
        GROUP BY bin.item_code, item.item_name, bin.warehouse
        ORDER BY bin.item_code
    """

    data = frappe.db.sql(query, {"warehouse": "Stores - S"}, as_dict=True)
    return columns, data
