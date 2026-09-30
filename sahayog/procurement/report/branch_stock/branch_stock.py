

import frappe
from frappe.utils import getdate

def execute(filters=None):
    if not filters:
        filters = {}

    warehouse = filters.get("warehouse")
    item_code = filters.get("item_code")

    columns = [
        dict(fieldname="item_code", label="Item Code", fieldtype="Link", options="Item", width=150),
        dict(fieldname="item_name", label="Item Name", fieldtype="Data", width=200),
        dict(fieldname="warehouse", label="Warehouse", fieldtype="Link", options="Warehouse", width=150),
        dict(fieldname="opening_balance", label="Opening Balance", fieldtype="Float", width=130),
        dict(fieldname="closing_balance", label="Closing Balance", fieldtype="Float", width=130),
        dict(fieldname="select_row", label="Select Items", fieldtype="Data", width=60),
    ]

    conditions = "WHERE 1=1"
    values = {"today": getdate()}

    if warehouse:
        conditions += " AND base.warehouse = %(warehouse)s"
        values["warehouse"] = warehouse

    if item_code:
        conditions += " AND base.item_code = %(item_code)s"
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
                from sahayog.procurement.api.stock_balance_ledger import (
                    get_user_division_warehouse,
                )

                # Division users (e.g. JLL) see their division warehouse
                division_warehouse = get_user_division_warehouse(user)
                if division_warehouse:
                    conditions += " AND base.warehouse = %(division_warehouse)s"
                    values["division_warehouse"] = division_warehouse
                else:
                    sol_id = frappe.db.get_value("Employee", {"user_id": user}, "sol_id")
                    if sol_id:
                        conditions += " AND base.warehouse = %(sol_id)s"
                        values["sol_id"] = sol_id
                    else:
                        return columns, []

    # Opening Balance = balance after yesterday's inward/outward (i.e. before today's movement)
    # Closing Balance  = opening balance + today's inward - today's outward for that item/warehouse
    query = """
        SELECT
            stock.item_code,
            item.item_name,
            stock.warehouse,
            stock.opening_balance,
            stock.closing_balance,
            '' AS select_row
        FROM (
            SELECT
                base.item_code,
                base.warehouse,
                COALESCE(bal.qty, 0) - COALESCE(today.inward, 0) + COALESCE(today.outward, 0) AS opening_balance,
                COALESCE(bal.qty, 0) AS closing_balance,
                COALESCE(today.inward, 0) AS inward,
                COALESCE(today.outward, 0) AS outward
            FROM (
                SELECT item_code, warehouse
                FROM `tabBin`
                WHERE actual_qty != 0
                UNION
                SELECT item_code, warehouse
                FROM `tabStock Ledger Entry`
                WHERE posting_date = %(today)s
                    AND actual_qty != 0
                    AND is_cancelled = 0
            ) base
            LEFT JOIN (
                SELECT item_code, warehouse, SUM(actual_qty) AS qty
                FROM `tabBin`
                GROUP BY item_code, warehouse
            ) bal
                ON bal.item_code = base.item_code
                AND bal.warehouse = base.warehouse
            LEFT JOIN (
                SELECT item_code, warehouse,
                    SUM(CASE WHEN actual_qty > 0 THEN actual_qty ELSE 0 END) AS inward,
                    SUM(CASE WHEN actual_qty < 0 THEN -actual_qty ELSE 0 END) AS outward
                FROM `tabStock Ledger Entry`
                WHERE posting_date = %(today)s
                    AND is_cancelled = 0
                GROUP BY item_code, warehouse
            ) today
                ON today.item_code = base.item_code
                AND today.warehouse = base.warehouse
            {conditions}
        ) stock
        LEFT JOIN `tabItem` item ON item.name = stock.item_code
        WHERE stock.opening_balance != 0
            OR stock.closing_balance != 0
            OR stock.inward != 0
            OR stock.outward != 0
        ORDER BY stock.item_code, stock.warehouse
    """.format(conditions=conditions)

    data = frappe.db.sql(query, values, as_dict=True)
    return columns, data
