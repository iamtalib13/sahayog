# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Report Date", "fieldname": "report_date", "fieldtype": "Date", "width": 100},
        {"label": "Calling Date", "fieldname": "calling_date", "fieldtype": "Date", "width": 100},
        {"label": "Trainer ID", "fieldname": "trainer", "fieldtype": "Link", "options": "Employee", "width": 150},
        {"label": "Trainer Name", "fieldname": "trainer_name", "fieldtype": "Data", "width": 180},
        {"label": "Agent ID", "fieldname": "agent", "fieldtype": "Link", "options": "Agent", "width": 150},
        {"label": "Agent Name", "fieldname": "agent_name", "fieldtype": "Data", "width": 180},
        {"label": "Phone", "fieldname": "agent_phone_number", "fieldtype": "Data", "width": 120},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Link", "options": "Branch", "width": 120},
        {"label": "District", "fieldname": "district", "fieldtype": "Data", "width": 120},
        {"label": "Date of Joining", "fieldname": "date_of_joining", "fieldtype": "Date", "width": 120},
        {"label": "Connected?", "fieldname": "connected_status", "fieldtype": "Data", "width": 100},
        {"label": "Reply Type", "fieldname": "reply_type", "fieldtype": "Data", "width": 100},
        {"label": "Wants to Stay", "fieldname": "wants_to_stay", "fieldtype": "Check", "width": 100},
        {"label": "Want to Exit", "fieldname": "want_to_exit", "fieldtype": "Check", "width": 100},
        {"label": "Exited", "fieldname": "exited", "fieldtype": "Check", "width": 100},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "Data", "width": 200},
    ]

    conditions = ""
    if filters.get("from_date"):
        conditions += " AND acl.calling_date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND acl.calling_date <= %(to_date)s"
    if filters.get("trainer"):
        conditions += " AND acl.trainer = %(trainer)s"
    if filters.get("agent"):
        conditions += " AND acl.agent = %(agent)s"
    if filters.get("connected_status"):
        conditions += " AND acl.connected_status = %(connected_status)s"
    if filters.get("reply_type"):
        conditions += " AND acl.reply_type = %(reply_type)s"

    data = frappe.db.sql(f"""
        SELECT
            acl.report_date,
            acl.calling_date,
            acl.trainer,
            e.employee_name AS trainer_name,
            acl.agent,
            acl.agent_name,
            acl.agent_phone_number,
            acl.branch,
            acl.district,
            acl.date_of_joining,
            acl.connected_status,
            acl.reply_type,
            acl.wants_to_stay,
            acl.want_to_exit,
            acl.exited,
            acl.remarks
        FROM
            `tabAgent Activation Call Log` acl
        LEFT JOIN
            `tabEmployee` e ON e.name = acl.trainer
        WHERE
            acl.docstatus < 2 {conditions}
        ORDER BY
            acl.calling_date DESC
    """, filters, as_dict=1)

    return columns, data
