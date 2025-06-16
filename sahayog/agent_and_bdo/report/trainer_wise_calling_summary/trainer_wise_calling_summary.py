# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Trainer ID", "fieldname": "trainer", "fieldtype": "Link", "options": "Employee", "width": 150},
        {"label": "Trainer Name", "fieldname": "trainer_name", "fieldtype": "Data", "width": 180},
        {"label": "Total Calls", "fieldname": "total_calls", "fieldtype": "Int", "width": 120},
        {"label": "Connected", "fieldname": "connected", "fieldtype": "Int", "width": 100},
        {"label": "Not Connected", "fieldname": "not_connected", "fieldtype": "Int", "width": 100},
        {"label": "Positive Replies", "fieldname": "positive", "fieldtype": "Int", "width": 120},
        {"label": "Negative Replies", "fieldname": "negative", "fieldtype": "Int", "width": 120},
        {"label": "Wants to Stay", "fieldname": "wants_to_stay", "fieldtype": "Int", "width": 100},
        {"label": "Want to Exit", "fieldname": "want_to_exit", "fieldtype": "Int", "width": 100},
        {"label": "Exited", "fieldname": "exited", "fieldtype": "Int", "width": 100},
    ]

    conditions = ""
    if filters.get("from_date"):
        conditions += " AND acl.calling_date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND acl.calling_date <= %(to_date)s"

    data = frappe.db.sql(f"""
        SELECT
            acl.trainer AS trainer,
            e.employee_name AS trainer_name,
            COUNT(acl.name) AS total_calls,
            SUM(CASE WHEN acl.connected_status = 'Yes' THEN 1 ELSE 0 END) AS connected,
            SUM(CASE WHEN acl.connected_status = 'No' THEN 1 ELSE 0 END) AS not_connected,
            SUM(CASE WHEN acl.reply_type = 'Positive' THEN 1 ELSE 0 END) AS positive,
            SUM(CASE WHEN acl.reply_type = 'Negative' THEN 1 ELSE 0 END) AS negative,
            SUM(acl.wants_to_stay) AS wants_to_stay,
            SUM(acl.want_to_exit) AS want_to_exit,
            SUM(acl.exited) AS exited
        FROM
            `tabAgent Activation Call Log` acl
        LEFT JOIN
            `tabEmployee` e ON e.name = acl.trainer
        WHERE
            acl.docstatus < 2 {conditions}
        GROUP BY
            acl.trainer, e.employee_name
        ORDER BY
            total_calls DESC
    """, filters, as_dict=1)

    return columns, data
