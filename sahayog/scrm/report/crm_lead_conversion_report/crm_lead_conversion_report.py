# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt


import frappe

def execute(filters=None):
    columns = [
        {"label": "Employee ID", "fieldname": "name", "fieldtype": "Link", "options": "Employee", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 240},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Link", "options": "Branch", "width": 120},
        {"label": "Total Leads", "fieldname": "total_leads", "fieldtype": "Int", "width": 100},
        {"label": "Converted Leads", "fieldname": "converted_leads", "fieldtype": "Int", "width": 150},
        {"label": "Conversion Rate (%)", "fieldname": "conversion_rate", "fieldtype": "Percent", "width": 180},
    ]

    lead_stats = frappe.db.sql("""
        SELECT
            owner AS user_id,
            COUNT(*) AS total_leads,
            SUM(CASE WHEN status IN ('Converted', 'Opportunity') THEN 1 ELSE 0 END) AS converted_leads
        FROM `tabLead`
        GROUP BY owner
    """, as_dict=True)

    data = []
    for stat in lead_stats:
        emp = frappe.db.get_value("Employee", {"user_id": stat.user_id}, ["name", "employee_name", "branch"], as_dict=True)
        if not emp:
            continue

        conversion_rate = round((stat.converted_leads / stat.total_leads) * 100, 2) if stat.total_leads else 0

        data.append({
            "name": emp.name,
            "employee_name": emp.employee_name,
            "branch": emp.branch,
            "total_leads": stat.total_leads,
            "converted_leads": stat.converted_leads,
            "conversion_rate": conversion_rate,
        })

    return columns, data
