import frappe

def execute(filters=None):
    """
    Script Report: Disciplinary Case Dashboard
    (with Summary + Chart + Table + Date Filters)
    """
    if not filters:
        filters = {}

    # Extract filters
    status = filters.get("case_status")
    branch = filters.get("branch_name")
    zone = filters.get("zone")
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    # ---------------------------
    # Conditions of filters
    # ---------------------------
    conditions = "WHERE 1=1"

    if status:
        conditions += " AND dc.case_status = %(case_status)s"
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
        {"label": "Case ID", "fieldname": "case_id", "fieldtype": "Link", "options": "Disciplinary Case", "width": 165},
        {"label": "Status", "fieldname": "case_status", "fieldtype": "Data", "width": 120},
		{"label": "Employee ID", "fieldname": "employee_id", "fieldtype": "Data", "width": 100},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 180},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 150},
        {"label": "Branch", "fieldname": "branch_name", "fieldtype": "Data", "width": 95},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 75},
        {"label": "Case Type", "fieldname": "case_type", "fieldtype": "Data", "width": 130},
        {"label": "Category", "fieldname": "category", "fieldtype": "Data", "width": 80},
        {"label": "Occurrence Date", "fieldname": "issue_occurrence_date", "fieldtype": "Date", "width": 110},
        {"label": "Reported To HR", "fieldname": "issue_report_to_hr", "fieldtype": "Date", "width": 110},
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
            dc.zone,
            dc.case_type,
            dc.category,
            dc.issue_occurrence_date,
            dc.issue_report_to_hr,
            dc.case_status
        FROM `tabDisciplinary Case` dc
        {conditions}
        ORDER BY dc.issue_occurrence_date DESC
    """, filters, as_dict=True)

    # ---------------------------
    # Summary Counts of the Report
    # ---------------------------
    total_cases = len(data)
    under_process = sum(1 for d in data if d.case_status == "Under Process")
    closed = sum(1 for d in data if d.case_status == "Closed")

    report_summary = [
        {"label": "Total Cases", "value": total_cases, "indicator": "Blue"},
        {"label": "Under Process", "value": under_process, "indicator": "red"},
        {"label": "Closed", "value": closed, "indicator": "Green"},
    ]

    # ---------------------------
    # Chart: Case Status Count
    # ---------------------------
    chart_data = frappe.db.sql("""
        SELECT case_status, COUNT(name) as count
        FROM `tabDisciplinary Case`
        GROUP BY case_status
    """, as_dict=True)

    chart_labels = [d.case_status for d in chart_data]
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
