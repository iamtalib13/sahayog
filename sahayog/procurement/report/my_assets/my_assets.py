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
            "label": "Asset Movement",
            "fieldname": "asset_movement",
            "fieldtype": "Link",
            "options": "Asset Movement",
            "width": 180,
        },
        {
            "label": "Transfer Date",
            "fieldname": "transaction_date",
            "fieldtype": "Datetime",
            "width": 160,
        },
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
            "width": 220,
        },
        {
            "label": "Source Location",
            "fieldname": "source_location",
            "fieldtype": "Data",
            "width": 180,
        },
        {
            "label": "Target Location",
            "fieldname": "target_location",
            "fieldtype": "Data",
            "width": 180,
        },
        {
            "label": "To Employee",
            "fieldname": "to_employee",
            "fieldtype": "Link",
            "options": "Employee",
            "width": 140,
        },
        # {
        #     "label": "Reference",
        #     "fieldname": "reference_name",
        #     "fieldtype": "Link",
        #     "options": "Employee Material Request",
        #     "width": 200,
        # },
    ]


def get_data():
    return frappe.db.sql(
        """
        SELECT
            am.name                    AS asset_movement,
            am.transaction_date        AS transaction_date,
            ami.asset                  AS asset,
            a.asset_name               AS asset_name,
            ami.source_location        AS source_location,
            ami.target_location        AS target_location,
            ami.to_employee            AS to_employee,
            am.reference_name          AS reference_name
        FROM
            `tabAsset Movement` am
        INNER JOIN
            `tabAsset Movement Item` ami
            ON ami.parent = am.name
        INNER JOIN
            `tabAsset` a
            ON a.name = ami.asset
        WHERE
            am.docstatus = 1
            AND ami.to_employee = '1754'
        ORDER BY
            am.transaction_date DESC
        """,
        as_dict=True,
    )
