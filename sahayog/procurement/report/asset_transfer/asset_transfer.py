# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

# import frappe

import frappe
from frappe.utils import getdate


def execute(filters=None):
    filters = filters or {}

    columns = get_columns()
    data = get_data(filters)

    return columns, data


def get_columns():
    return [
        {
            "label": "Asset",
            "fieldname": "asset",
            "fieldtype": "Link",
            "options": "Asset",
            "width": 160,
        },
        {
            "label": "Asset Name",
            "fieldname": "asset_name",
            "fieldtype": "Data",
            "width": 200,
        },
        {
            "label": "Movement Date",
            "fieldname": "movement_date",
            "fieldtype": "Date",
            "width": 120,
        },
        {
            "label": "From Location",
            "fieldname": "from_location",
            "fieldtype": "Data",
            "width": 180,
        },
        {
            "label": "To Location",
            "fieldname": "to_location",
            "fieldtype": "Data",
            "width": 180,
        },
        {
            "label": "From Custodian",
            "fieldname": "from_custodian",
            "fieldtype": "Link",
            "options": "Employee",
            "width": 180,
        },
        {
            "label": "To Custodian",
            "fieldname": "to_custodian",
            "fieldtype": "Link",
            "options": "Employee",
            "width": 180,
        },
        {
            "label": "Asset Movement",
            "fieldname": "asset_movement",
            "fieldtype": "Link",
            "options": "Asset Movement",
            "width": 180,
        },
        {
            "label": "Status",
            "fieldname": "status",
            "fieldtype": "Data",
            "width": 120,
        },
    ]


def get_data(filters):
    conditions = []
    values = {}

    if filters.get("asset"):
        conditions.append("ami.asset = %(asset)s")
        values["asset"] = filters["asset"]

    if filters.get("from_date"):
        conditions.append("am.transaction_date >= %(from_date)s")
        values["from_date"] = filters["from_date"]

    if filters.get("to_date"):
        conditions.append("am.transaction_date <= %(to_date)s")
        values["to_date"] = filters["to_date"]

    condition_sql = " AND ".join(conditions)
    if condition_sql:
        condition_sql = " AND " + condition_sql

    return frappe.db.sql(
        f"""
        SELECT
            ami.asset                    AS asset,
            a.asset_name                 AS asset_name,
            am.transaction_date          AS movement_date,
            ami.source_location          AS from_location,
            ami.target_location          AS to_location,
            a.custodian                  AS current_custodian,
            am.name                      AS asset_movement,
            am.docstatus                 AS status
        FROM
            `tabAsset Movement` am
        INNER JOIN
            `tabAsset Movement Item` ami
            ON ami.parent = am.name
        INNER JOIN
            `tabAsset` a
            ON a.name = ami.asset
        WHERE
            am.purpose = 'Transfer'
            AND am.docstatus = 1
            {condition_sql}
        ORDER BY
            am.transaction_date DESC
        """,
        values,
        as_dict=True,
    )
