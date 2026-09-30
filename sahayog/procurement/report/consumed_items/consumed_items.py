# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

# import frappe
import frappe


def execute(filters=None):
    columns = get_columns()
    data = get_data()
    return columns, data


def get_columns():
    return [
        {
            "label": "Record ID",
            "fieldname": "record_id",
            "fieldtype": "Link",
            "options": "Stock Entry",
            "width": 180,
        },
        {
            "label": "Item Code",
            "fieldname": "item_code",
            "fieldtype": "Link",
            "options": "Item",
            "width": 140,
        },
        {
            "label": "Item Name",
            "fieldname": "item_name",
            "fieldtype": "Data",
            "width": 220,
        },
        {
            "label": "Quantity Issued",
            "fieldname": "qty",
            "fieldtype": "Float",
            "width": 120,
        },
        {
            "label": "From Warehouse",
            "fieldname": "from_warehouse",
            "fieldtype": "Link",
            "options": "Warehouse",
            "width": 160,
        },
        # {
        #     "label": "To Warehouse / Branch",
        #     "fieldname": "to_warehouse",
        #     "fieldtype": "Link",
        #     "options": "Warehouse",
        #     "width": 180,
        # },
        {
            "label": "Posting Date",
            "fieldname": "posting_date",
            "fieldtype": "Date",
            "width": 120,
        },
        {
            "label": "Issued By",
            "fieldname": "owner",
            "fieldtype": "Link",
            "options": "User",
            "width": 160,
        },
    ]


def get_user_scope():
    """
    Return (show_all, warehouse).
    - User has a record in Sahayog Settings -> wh_dept_map : sees every warehouse
    - Otherwise : sees only their own branch warehouse (Employee.sol_id)
    """
    user = frappe.session.user
    if user == "Administrator" or "System Manager" in frappe.get_roles(user):
        return True, None

    settings = frappe.get_single("Sahayog Settings")
    for row in settings.wh_dept_map or []:
        if (row.user_id or "").strip() == user:
            return True, None

    sol_id = frappe.db.get_value("Employee", {"user_id": user}, "sol_id")
    return False, sol_id


def get_data():
    show_all, warehouse = get_user_scope()

    if not show_all and not warehouse:
        return []

    conditions = """
            se.stock_entry_type = 'Material Issue'
            AND se.docstatus = 1
    """
    values = {}

    if not show_all:
        conditions += " AND sed.s_warehouse = %(warehouse)s"
        values["warehouse"] = warehouse

    return frappe.db.sql(
        """
        SELECT
            se.name              AS record_id,      -- ✅ Stock Entry ID
            sed.item_code        AS item_code,
            sed.item_name        AS item_name,
            sed.qty              AS qty,
            sed.s_warehouse      AS from_warehouse,
            sed.t_warehouse      AS to_warehouse,
            se.posting_date      AS posting_date,
            se.owner             AS owner
        FROM
            `tabStock Entry` se
        INNER JOIN
            `tabStock Entry Detail` sed
            ON sed.parent = se.name
        WHERE
            {conditions}
        ORDER BY
            se.posting_date DESC
        """.format(conditions=conditions),
        values,
        as_dict=True,
    )
