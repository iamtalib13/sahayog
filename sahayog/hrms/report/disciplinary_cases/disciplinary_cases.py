import frappe
from datetime import date

def execute(filters=None):
    if not filters:
        filters = {}

    status = filters.get("status")
    branch = filters.get("branch_name")
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    conditions = "WHERE 1=1"

    if status:
        conditions += " AND dc.status = %(status)s"
    if branch:
        conditions += " AND dc.branch_name = %(branch_name)s"
    if from_date:
        conditions += " AND dc.issue_occurrence_date >= %(from_date)s"
    if to_date:
        conditions += " AND dc.issue_occurrence_date <= %(to_date)s"

    columns = [
        {"label": "Sr. No.", "fieldname": "sr_no", "fieldtype": "Int", "width": 50},
        {"label": "Employee Code", "fieldname": "employee_id", "fieldtype": "Data", "width": 80},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 160},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 130},
        {"label": "Branch / Location", "fieldname": "branch_name", "fieldtype": "Data", "width": 100},
        {"label": "Region", "fieldname": "region", "fieldtype": "Data", "width": 90},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 80},
        {"label": "Division", "fieldname": "division", "fieldtype": "Data", "width": 80},
        {"label": "Type of misconduct", "fieldname": "case_type", "fieldtype": "Data", "width": 130},
        {"label": "Issues in Detail", "fieldname": "issues_in_detail", "fieldtype": "Small Text", "width": 250},
        {"label": "Date/Period of Occurrence", "fieldname": "issue_occurrence_date", "fieldtype": "Date", "width": 100},
        {"label": "Date-Issue come in the notice of RO-HR", "fieldname": "issue_report_to_hr", "fieldtype": "Date", "width": 110},
        {"label": "Category - Major/Minor", "fieldname": "category", "fieldtype": "Data", "width": 90},
        {"label": "Show Cause Notice Date", "fieldname": "show_cause_date", "fieldtype": "Date", "width": 105},
        {"label": "Date of Domestic Enquiry", "fieldname": "domestic_enquiry_date", "fieldtype": "Date", "width": 105},
        {"label": "Stage at which case is Under Process", "fieldname": "status", "fieldtype": "Data", "width": 115},
        {"label": "Caseage (if under process) Days", "fieldname": "case_age_days", "fieldtype": "Int", "width": 90},
        {"label": "Case closed with", "fieldname": "case_closed_with", "fieldtype": "Data", "width": 120},
        {"label": "Case Closing Level", "fieldname": "case_closing_level", "fieldtype": "Data", "width": 80},
        {"label": "OPENED VS CLOSED", "fieldname": "opened_vs_closed", "fieldtype": "Data", "width": 90},
        {"label": "Date of Closure", "fieldname": "date_of_closure", "fieldtype": "Date", "width": 100},
        {"label": "Date closure Letter Issued", "fieldname": "closure_letter_issued", "fieldtype": "Data", "width": 85},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "Small Text", "width": 200},
        {"label": "HR Reporting to Closure Ageing", "fieldname": "hr_to_closure_ageing", "fieldtype": "Int", "width": 100},
        {"label": "Ageing for Closed Cases", "fieldname": "ageing_closed", "fieldtype": "Int", "width": 80},
        {"label": "TODAY - SHOW CAUSE DATE", "fieldname": "today_minus_scn", "fieldtype": "Int", "width": 90},
        {"label": "Now Vs Date of HR reporting", "fieldname": "now_vs_hr_reporting", "fieldtype": "Int", "width": 100},
        {"label": "Ageing of Pending Cases", "fieldname": "ageing_pending", "fieldtype": "Int", "width": 90},
    ]

    today = date.today()

    data = frappe.db.sql(f"""
        SELECT
            dc.employee_id,
            dc.employee_name,
            dc.designation,
            dc.branch_name,
            dc.region,
            dc.zone,
            emp.custom_division AS division,
            dc.case_type,
            dc.description AS issues_in_detail,
            dc.issue_occurrence_date,
            dc.issue_report_to_hr,
            dc.category,
            dc.status,
            dc.level AS case_closing_level,
            COALESCE(
                (SELECT cc_sub.remarks FROM `tabCase Closure` cc_sub WHERE cc_sub.case_id = dc.case_id ORDER BY cc_sub.creation DESC LIMIT 1),
                dc.remarks
            ) AS remarks,
            dc.creation,

            COALESCE(
                (SELECT MIN(rs.creation) FROM `tabResponse to SCN` rs WHERE rs.case_id = dc.name),
                dc.issue_report_to_hr
            ) AS show_cause_date,

            (SELECT MIN(de.date_of_enquiry) FROM `tabDomestic Enquiry` de WHERE de.case_id = dc.name) AS domestic_enquiry_date,

            (SELECT cc_sub.case_close_with FROM `tabCase Closure` cc_sub WHERE cc_sub.case_id = dc.case_id ORDER BY cc_sub.creation DESC LIMIT 1) AS case_closed_with,

            (SELECT cc_sub.creation FROM `tabCase Closure` cc_sub WHERE cc_sub.case_id = dc.case_id ORDER BY cc_sub.creation DESC LIMIT 1) AS date_of_closure,

            CASE
                WHEN (SELECT cc_sub.case_close_with FROM `tabCase Closure` cc_sub WHERE cc_sub.case_id = dc.case_id ORDER BY cc_sub.creation DESC LIMIT 1) IS NOT NULL
                THEN 'Yes'
                WHEN dc.status = 'Closed' THEN 'Yes'
                ELSE ''
            END AS closure_letter_issued,

            DATEDIFF(%(today)s, dc.creation) AS case_age_days,
            CASE WHEN dc.status = 'Closed' THEN 'CLOSED' ELSE 'OPEN' END AS opened_vs_closed,

            CASE
                WHEN dc.status = 'Closed'
                THEN DATEDIFF(
                    (SELECT cc_sub.creation FROM `tabCase Closure` cc_sub WHERE cc_sub.case_id = dc.case_id ORDER BY cc_sub.creation DESC LIMIT 1),
                    dc.issue_report_to_hr
                )
                ELSE NULL
            END AS hr_to_closure_ageing,

            CASE
                WHEN dc.status = 'Closed'
                THEN DATEDIFF(%(today)s,
                    (SELECT cc_sub.creation FROM `tabCase Closure` cc_sub WHERE cc_sub.case_id = dc.case_id ORDER BY cc_sub.creation DESC LIMIT 1)
                )
                ELSE NULL
            END AS ageing_closed,

            DATEDIFF(%(today)s, dc.creation) AS today_minus_scn,

            DATEDIFF(%(today)s, dc.issue_report_to_hr) AS now_vs_hr_reporting,

            CASE
                WHEN dc.status != 'Closed' THEN DATEDIFF(%(today)s, dc.creation)
                ELSE NULL
            END AS ageing_pending

        FROM `tabDisciplinary Case` dc
        LEFT JOIN `tabEmployee` emp ON emp.name = dc.employee_id
        {conditions}
        ORDER BY dc.creation DESC
    """, {**filters, "today": today}, as_dict=True)

    for i, row in enumerate(data, start=1):
        row["sr_no"] = i

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

    chart_data = frappe.db.sql("""
        SELECT status, COUNT(name) as count
        FROM `tabDisciplinary Case`
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
        "type": "bar",
        "colors": ["#00bcd4", "#ff9800", "#4caf50", "#f44336"],
        "height": 150
    }

    return columns, data, None, chart, report_summary
