# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Meeting ID", "fieldname": "meeting_id", "fieldtype": "Link", "options": "Meeting", "width": 150},
        {"label": "Date", "fieldname": "date", "fieldtype": "Date", "width": 100},
        {"label": "Type", "fieldname": "type", "fieldtype": "Data", "width": 100},
        {"label": "Employee / Agent ID", "fieldname": "participant_id", "fieldtype": "Dynamic Link", "options": "type", "width": 150},
        {"label": "Full Name", "fieldname": "full_name", "fieldtype": "Data", "width": 180},
        {"label": "Trainer", "fieldname": "trainer", "fieldtype": "Link", "options": "Employee", "width": 150},
        {"label": "Trainer Name", "fieldname": "trainer_name", "fieldtype": "Data", "width": 150},
        {"label": "Location", "fieldname": "training_location", "fieldtype": "Data", "width": 120},
        {"label": "Topic", "fieldname": "topic", "fieldtype": "Data", "width": 150},
    ]

    conditions = ""
    if filters.get("from_date"):
        conditions += " AND m.date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND m.date <= %(to_date)s"
    if filters.get("type"):
        conditions += " AND a.reference_doctype = %(type)s"
    if filters.get("participant_id"):
        conditions += " AND a.agent_employee = %(participant_id)s"
    if filters.get("trainer"):
        conditions += " AND m.trainer = %(trainer)s"

    data = frappe.db.sql(f"""
        SELECT
            m.name AS meeting_id,
            m.date,
            a.reference_doctype AS type,
            a.agent_employee AS participant_id,
            a.full_name,
            m.trainer,
            emp.employee_name AS trainer_name,
            m.training_location,
            m.topic
        FROM
            `tabAttendees` a
        INNER JOIN
            `tabMeeting` m ON m.name = a.parent AND a.parenttype = 'Meeting'
        LEFT JOIN
            `tabEmployee` emp ON m.trainer = emp.name
        WHERE
            m.docstatus < 2 {conditions}
        ORDER BY
            m.date DESC, m.name
    """, filters, as_dict=1)

    return columns, data
