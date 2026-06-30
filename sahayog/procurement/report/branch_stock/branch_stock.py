

import frappe

def execute(filters=None):
    if not filters:
        filters = {}

    warehouse = filters.get("warehouse")
    item_code = filters.get("item_code")

    columns = [
        dict(fieldname="item_code", label="Item Code", fieldtype="Link", options="Item", width=150),
        dict(fieldname="item_name", label="Item Name", fieldtype="Data", width=200),
        dict(fieldname="warehouse", label="Warehouse", fieldtype="Link", options="Warehouse", width=150),
        dict(fieldname="stock_balance", label="Stock Balance", fieldtype="Float", width=120),
        dict(fieldname="select_row", label="Select Items", fieldtype="Data", width=60),
    ]

    conditions = "WHERE bin.actual_qty != 0"
    values = {}

    if warehouse:
        conditions += " AND bin.warehouse = %(warehouse)s"
        values["warehouse"] = warehouse
    
    if item_code:
        conditions += " AND bin.item_code = %(item_code)s"
        values["item_code"] = item_code

    if not warehouse:
        # Check if user exists in Sahayog Settings
        user = frappe.session.user
        exists_in_settings = frappe.db.exists(
            "Default Warehouse",
            {"parent": "Sahayog Settings", "parenttype": "Sahayog Settings", "user_id": user}
        )

        if exists_in_settings:
            # User in Sahayog Settings sees ALL warehouses (no additional filter)
            pass
        else:
            # Fallback to sol_id or Admin check
            user_roles = frappe.get_roles(user)
            if user != "Administrator" and "System Manager" not in user_roles:
                sol_id = frappe.db.get_value("Employee", {"user_id": user}, "sol_id")
                if sol_id:
                    conditions += " AND bin.warehouse = %(sol_id)s"
                    values["sol_id"] = sol_id
                else:
                    return columns, []

    query = f"""
        SELECT
            bin.item_code,
            item.item_name,
            bin.warehouse,
            SUM(bin.actual_qty) AS stock_balance,
            '' AS select_row
        FROM `tabBin` bin
        LEFT JOIN `tabItem` item ON bin.item_code = item.name
        {conditions}
        GROUP BY bin.item_code, item.item_name, bin.warehouse
        HAVING SUM(bin.actual_qty) != 0
        ORDER BY bin.item_code, bin.warehouse
    """

    data = frappe.db.sql(query, values, as_dict=True)
    return columns, data
