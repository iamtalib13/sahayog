# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Trainer ID", "fieldname": "trainer_id", "fieldtype": "Link", "options": "Employee", "width": 150},
        {"label": "Trainer Name", "fieldname": "trainer_name", "fieldtype": "Data", "width": 200},
        {"label": "No. of Meetings Taken", "fieldname": "meeting_count", "fieldtype": "Int", "width": 180},
        {"label": "Total Attendees", "fieldname": "attendee_count", "fieldtype": "Int", "width": 160},
    ]

    conditions = ""
    if filters.get("from_date"):
        conditions += " AND m.date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND m.date <= %(to_date)s"
    if filters.get("trainer"):
        conditions += " AND m.trainer = %(trainer)s"

    data = frappe.db.sql(f"""
        SELECT
            m.trainer AS trainer_id,
            emp.employee_name AS trainer_name,
            COUNT(DISTINCT m.name) AS meeting_count,
            COUNT(a.name) AS attendee_count
        FROM
            `tabMeeting` m
        LEFT JOIN
            `tabAttendees` a ON a.parent = m.name AND a.parenttype = 'Meeting'
        LEFT JOIN
            `tabEmployee` emp ON emp.name = m.trainer
        WHERE
            m.docstatus < 2 {conditions}
        GROUP BY
            m.trainer, emp.employee_name
        ORDER BY
            meeting_count DESC
    """, filters, as_dict=True)

    return columns, data