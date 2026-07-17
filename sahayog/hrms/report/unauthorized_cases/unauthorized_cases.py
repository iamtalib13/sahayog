# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

# import frappe


import frappe

def execute(filters=None):
    """
    Script Report: Unauthorized Absences Dashboard
    (with Summary + Chart + Table + Date Filters)
    """
    if not filters:
        filters = {}

    # Extract filters
    status = filters.get("status")
    branch = filters.get("branch_name")
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    # ---------------------------
    # Conditions of filters
    # ---------------------------
    conditions = "WHERE 1=1"

    if status:
        conditions += " AND dc.status = %(status)s"
    if branch:
        conditions += " AND dc.branch_name = %(branch_name)s"
    if from_date:
        conditions += " AND dc.issue_occurrence_date >= %(from_date)s"
    if to_date:
        conditions += " AND dc.issue_occurrence_date <= %(to_date)s"

    # ---------------------------
    # Columns of the Report
    # ---------------------------
    columns = [
        {"label": "Case ID", "fieldname": "case_id", "fieldtype": "Link", "options": "Unauthorized Absence", "width": 165},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
        {"label": "Employee ID", "fieldname": "employee_id", "fieldtype": "Data", "width": 100},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 180},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 150},
        {"label": "Branch", "fieldname": "branch_name", "fieldtype": "Data", "width": 95},
        {"label": "Zone", "fieldname": "zone_name", "fieldtype": "Data", "width": 75},
        {"label": "Occurrence Date", "fieldname": "issue_occurrence_date", "fieldtype": "Date", "width": 110},
    ]

    # ---------------------------
    # Data Fetch of the Report
    # ---------------------------
    data = frappe.db.sql(f"""
        SELECT
            dc.name AS name,
            dc.case_id,
            dc.employee_id,
            dc.employee_name,
            dc.designation,
            dc.branch_name,
            dc.zone_name,
            dc.issue_occurrence_date,
            dc.status,
            dc.creation,
            dc.modified
        FROM `tabUnauthorized Absence` dc
        {conditions}
        ORDER BY dc.modified DESC, dc.creation DESC
    """, filters, as_dict=True)

    # ---------------------------
    # Summary Counts of the Report
    # ---------------------------
    total_cases = len(data)
    draft = sum(1 for d in data if d.status == "Draft")
    under_process = sum(1 for d in data if d.status == "Under Process")
    closed = sum(1 for d in data if d.status == "Closed")

    report_summary = [
        {"label": "Total Cases", "value": total_cases, "indicator": "Blue"},
        {"label": "Draft", "value": draft, "indicator": "gray"},
        {"label": "Under Process", "value": under_process, "indicator": "red"},
        {"label": "Closed", "value": closed, "indicator": "Green"},
    ]

    # ---------------------------
    # Chart: Case Status Count
    # ---------------------------
    chart_data = frappe.db.sql("""
        SELECT status, COUNT(name) as count
        FROM `tabUnauthorized Absence`
        GROUP BY status
    """, as_dict=True)

    chart_labels = [d.status for d in chart_data]
    chart_values = [d.count for d in chart_data]

    chart = {
        "data": {
            "labels": chart_labels,
            "datasets": [
                {"name": "Cases", "values": chart_values}
            ]
        },
        "type": "bar",   # You can change to "pie" or "donut"
        "colors": ["#00bcd4", "#ff9800", "#4caf50", "#f44336"],
        "height": 150
    }

    return columns, data, None, None, report_summary
