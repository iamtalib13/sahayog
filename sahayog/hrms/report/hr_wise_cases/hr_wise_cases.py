import frappe
# excute function for HR Wise Cases report
def execute(filters=None):
    """
    HR Wise Cases Summary
    Shows HR-wise case count with proper access control
    (Admin sees all, HR sees their own cases)
    """

    if not filters:
        filters = {}

    user = frappe.session.user
    roles = frappe.get_roles(user)
    is_admin = "System Manager" in roles or user == "Administrator"

    # Get employee id linked to this user
    hr_employee_id = frappe.db.get_value("Employee", {"user_id": user}, "name")

    # Build where condition
    if is_admin:
        conditions = "WHERE 1=1"
    else:
        if hr_employee_id:
            conditions = f"WHERE dc.hr_employee_id = '{hr_employee_id}'"
        else:
            return get_columns(), [], None, None, []

    # Fetch data from Disciplinary Case doctype
    query = f"""
        SELECT
            dc.hr_employee_id,
            dc.hr_name,
            SUM(CASE WHEN dc.status = 'Draft' THEN 1 ELSE 0 END) AS draft_count,
            SUM(CASE WHEN dc.status = 'Under Process' THEN 1 ELSE 0 END) AS under_process_count,
            SUM(CASE WHEN dc.status = 'Closed' THEN 1 ELSE 0 END) AS closed_count,
            COUNT(dc.name) AS total_cases
        FROM `tabDisciplinary Case` dc
        {conditions}
        GROUP BY dc.hr_employee_id, dc.hr_name
        ORDER BY dc.hr_name ASC
    """

    data = frappe.db.sql(query, as_dict=True)

    # Report summary of totals cases
    total_draft = sum(d.get("draft_count", 0) for d in data)
    total_under_process = sum(d.get("under_process_count", 0) for d in data)
    total_closed = sum(d.get("closed_count", 0) for d in data)
    total_cases = sum(d.get("total_cases", 0) for d in data)

	#Prepare report summary
    report_summary = [
        {"label": "Overall Cases", "value": total_cases, "indicator": "Blue"},
        {"label": "Total Draft", "value": total_draft, "indicator": "Gray"},
        {"label": "Total Under Process", "value": total_under_process, "indicator": "Red"},
        {"label": "Total Closed", "value": total_closed, "indicator": "Green"},
    ]

    # Chart only for Admins
    chart = None
    if is_admin and data:
        chart = {
            "data": {
                "labels": [d.hr_name or "Unknown" for d in data],
                "datasets": [
                    {"name": "Draft", "values": [d.draft_count for d in data]},
                    {"name": "Under Process", "values": [d.under_process_count for d in data]},
                    {"name": "Closed", "values": [d.closed_count for d in data]},
                ],
            },
            "type": "bar",
            "colors": ["#9e9e9e", "#ffb300", "#4caf50"],
            "height": 250,
        }

    return get_columns(), data, None, None, report_summary

# Define report columns
def get_columns():
    return [
        {"label": "HR Employee ID", "fieldname": "hr_employee_id", "fieldtype": "Data", "width": 160},
        {"label": "HR Employee Name", "fieldname": "hr_name", "fieldtype": "Data", "width": 220},
        {"label": "Draft", "fieldname": "draft_count", "fieldtype": "Int", "width": 150},
        {"label": "Under Process", "fieldname": "under_process_count", "fieldtype": "Int", "width": 180},
        {"label": "Closed", "fieldname": "closed_count", "fieldtype": "Int", "width": 150},
    ]
