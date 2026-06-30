# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Report Date", "fieldname": "report_date", "fieldtype": "Date", "width": 100},
        {"label": "Calling Date", "fieldname": "calling_date", "fieldtype": "Date", "width": 100},
        {"label": "Trainer ID", "fieldname": "trainer", "fieldtype": "Link", "options": "User", "width": 150},
        {"label": "Trainer Name", "fieldname": "trainer_name", "fieldtype": "Data", "width": 180},
        {"label": "Agent ID", "fieldname": "agent", "fieldtype": "Link", "options": "Agent", "width": 150},
        {"label": "Agent Name", "fieldname": "agent_name", "fieldtype": "Data", "width": 180},
        {"label": "Phone", "fieldname": "agent_phone_number", "fieldtype": "Data", "width": 120},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 120},
        {"label": "District", "fieldname": "district", "fieldtype": "Data", "width": 120},
        {"label": "Date of Joining", "fieldname": "date_of_joining", "fieldtype": "Date", "width": 120},
        {"label": "Connected?", "fieldname": "connected_status", "fieldtype": "Data", "width": 100},
        {"label": "Reply Type", "fieldname": "reply_type", "fieldtype": "Data", "width": 120},
        {"label": "Wants to Stay", "fieldname": "wants_to_stay", "fieldtype": "Check", "width": 100},
        {"label": "Want to Exit", "fieldname": "want_to_exit", "fieldtype": "Check", "width": 100},
        {"label": "Exited", "fieldname": "exited", "fieldtype": "Check", "width": 80},
        {"label": "Status", "fieldname": "agent_status", "fieldtype": "Data", "width": 120},
        {"label": "Collection Amount", "fieldname": "amount", "fieldtype": "Data", "width": 130},
        {"label": "Collection Date", "fieldname": "collection_date", "fieldtype": "Date", "width": 120},
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
            u.full_name AS trainer_name,
            acl.agent,
            ag.agent_name,
            acl.agent_phone_number,
            sb.branch,
            sb.district,
            ag.creation_date AS date_of_joining,
            acl.connected_status,
            acl.reply_type,
            acl.wants_to_stay,
            acl.want_to_exit,
            acl.exited,
            CASE
                WHEN IFNULL(acl.exited, 0) = 1 THEN 'Exited'
                WHEN IFNULL(acl.want_to_exit, 0) = 1 THEN 'Want to Exit'
                WHEN IFNULL(acl.wants_to_stay, 0) = 1
                    AND IFNULL(acl.amount, 0) <> 0 THEN 'Activated'
                WHEN IFNULL(acl.wants_to_stay, 0) = 1
                    AND IFNULL(acl.amount, 0) = 0 THEN 'Want to Stay'
                WHEN IFNULL(acl.wants_to_stay, 0) = 0
                    AND IFNULL(acl.exited, 0) = 0
                    AND IFNULL(acl.want_to_exit, 0) = 0 THEN 'Pending'
                ELSE ''
            END AS agent_status,
            acl.amount,
            acl.collection_date,
            acl.remarks
        FROM `tabAgent Activation Call Log` acl
        LEFT JOIN `tabUser` u ON u.name = acl.trainer
        LEFT JOIN `tabAgent` ag ON ag.name = acl.agent
        LEFT JOIN `tabSahayog Branch` sb ON sb.sol_id = ag.branch_code
        WHERE acl.docstatus < 2 {conditions}
        ORDER BY acl.calling_date DESC
    """, filters, as_dict=1)

    return columns, data
