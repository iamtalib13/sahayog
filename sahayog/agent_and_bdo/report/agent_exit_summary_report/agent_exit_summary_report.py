# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Report Date", "fieldname": "report_date", "fieldtype": "Date", "width": 100},
        {"label": "Trainer", "fieldname": "trainer", "fieldtype": "Link", "options": "Employee", "width": 150},
        {"label": "Trainer Name", "fieldname": "trainer_name", "fieldtype": "Data", "width": 150},
        {"label": "Calling Date", "fieldname": "calling_date", "fieldtype": "Date", "width": 100},
        {"label": "Agent", "fieldname": "agent", "fieldtype": "Link", "options": "Agent", "width": 150},
        {"label": "Agent Name", "fieldname": "agent_name", "fieldtype": "Data", "width": 150},
        {"label": "Mobile No", "fieldname": "agent_phone_number", "fieldtype": "Data", "width": 120},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Link", "options": "Branch", "width": 120},
        {"label": "District", "fieldname": "district", "fieldtype": "Data", "width": 120},
        {"label": "Exited", "fieldname": "exited", "fieldtype": "Check", "width": 80},
    ]

    conditions = ""
    if filters.get("from_date"):
        conditions += " AND ac.report_date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND ac.report_date <= %(to_date)s"
    if filters.get("trainer"):
        conditions += " AND ac.trainer = %(trainer)s"
    if filters.get("exited") is not None:
        conditions += " AND ac.exited = %(exited)s"

    data = frappe.db.sql(f"""
        SELECT
            ac.report_date,
            ac.trainer,
            emp.employee_name AS trainer_name,
            ac.calling_date,
            ac.agent,
            ac.agent_name,
            ac.agent_phone_number,
            ac.branch,
            ac.district,
            ac.exited
        FROM `tabAgent Activation Call Log` ac
        LEFT JOIN `tabEmployee` emp ON ac.trainer = emp.name
        WHERE ac.docstatus < 2 {conditions}
        ORDER BY ac.report_date DESC
    """, filters, as_dict=1)

    # Prepare chart data: Count of exited agents grouped by trainer
    trainer_exit_count = {}
    for row in data:
        if row.exited:
            trainer = row.trainer_name or "Unknown"
            trainer_exit_count[trainer] = trainer_exit_count.get(trainer, 0) + 1

    chart = {
        "data": {
            "labels": list(trainer_exit_count.keys()),
            "datasets": [
                {
                    "name": "Exited Agents",
                    "values": list(trainer_exit_count.values())
                }
            ]
        },
        "type": "bar",  # or "line", "pie"
        "colors": ["#e74c3c"]
    }

    return columns, data, None, chart
