# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Meeting ID", "fieldname": "meeting_id", "fieldtype": "Link", "options": "Meeting", "width": 150},
        {"label": "Date", "fieldname": "date", "fieldtype": "Date", "width": 100},
        {"label": "Topic", "fieldname": "topic", "fieldtype": "Data", "width": 150},
        {"label": "Location", "fieldname": "training_location", "fieldtype": "Data", "width": 120},
        {"label": "Trainer ID", "fieldname": "trainer", "fieldtype": "Link", "options": "Employee", "width": 120},
        {"label": "Trainer Name", "fieldname": "trainer_name", "fieldtype": "Data", "width": 150},
        {"label": "Start Time", "fieldname": "start_time", "fieldtype": "Data", "width": 100},
        {"label": "End Time", "fieldname": "end_time", "fieldtype": "Data", "width": 100},
        {"label": "Employees", "fieldname": "employee_count", "fieldtype": "Int", "width": 100},
        {"label": "Agents", "fieldname": "agent_count", "fieldtype": "Int", "width": 100},
        {"label": "Total Attendees", "fieldname": "total_attendees", "fieldtype": "Int", "width": 120},
    ]

    conditions = ""
    if filters.get("from_date"):
        conditions += " AND m.date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND m.date <= %(to_date)s"
    if filters.get("topic"):
        conditions += " AND m.topic = %(topic)s"
    if filters.get("trainer"):
        conditions += " AND m.trainer = %(trainer)s"

    data = frappe.db.sql(f"""
        SELECT
            m.name AS meeting_id,
            m.date,
            m.topic,
            m.training_location,
            m.trainer,
            e.employee_name AS trainer_name,
            TIME_FORMAT(m.start_time, '%%h:%%i %%p') AS start_time,
            TIME_FORMAT(m.end_time, '%%h:%%i %%p') AS end_time,
            COUNT(a.name) AS total_attendees,
            SUM(CASE WHEN a.reference_doctype = 'Employee' THEN 1 ELSE 0 END) AS employee_count,
            SUM(CASE WHEN a.reference_doctype = 'Agent' THEN 1 ELSE 0 END) AS agent_count
        FROM
            `tabMeeting` m
        LEFT JOIN
            `tabEmployee` e ON m.trainer = e.name
        LEFT JOIN
            `tabAttendees` a ON a.parent = m.name AND a.parenttype = 'Meeting'
        WHERE
            m.docstatus < 2 {conditions}
        GROUP BY
            m.name
        ORDER BY
            m.date DESC
    """, filters, as_dict=1)

    return columns, data
