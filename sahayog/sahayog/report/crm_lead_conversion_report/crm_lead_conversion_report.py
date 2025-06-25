# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import getdate

def execute(filters=None):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    filters = filters or {}

    employee = frappe.db.get_value(
        "Employee",
        {"user_id": user},
        ["name", "branch", "custom_zone", "custom_region"],
        as_dict=True
    )

    lead_conditions = ""

    # Apply role-based access
    if "Administrator" not in roles and "System Manager" not in roles and "Admin" not in roles:
        if "Branch Manager" in roles and employee and employee.branch:
            lead_conditions += f" AND l.custom_branch = {frappe.db.escape(employee.branch)}"
        elif "Zonal Manager" in roles and employee and employee.custom_zone:
            lead_conditions += f" AND l.custom_zone = {frappe.db.escape(employee.custom_zone)}"
        elif "Regional Manager" in roles and employee and employee.custom_region:
            lead_conditions += f" AND l.custom_region = {frappe.db.escape(employee.custom_region)}"
        else:
            frappe.throw("Your Employee record is missing branch/zone/region info.")

    # Apply user filters
    if filters.get("custom_branch"):
        lead_conditions += f" AND l.custom_branch = {frappe.db.escape(filters['custom_branch'])}"
    if filters.get("custom_zone"):
        lead_conditions += f" AND l.custom_zone = {frappe.db.escape(filters['custom_zone'])}"
    if filters.get("custom_region"):
        lead_conditions += f" AND l.custom_region = {frappe.db.escape(filters['custom_region'])}"
    if filters.get("from_date") and filters.get("to_date"):
        from_date = getdate(filters["from_date"])
        to_date = getdate(filters["to_date"])
        lead_conditions += f" AND DATE(l.creation) BETWEEN '{from_date}' AND '{to_date}'"

    # Query stats
    lead_stats = frappe.db.sql(f"""
        SELECT
            l.owner AS user_id,
            COUNT(*) AS total_leads,
            SUM(CASE WHEN l.status IN ('Converted', 'Opportunity') THEN 1 ELSE 0 END) AS converted_leads
        FROM `tabLead` l
        WHERE 1=1 {lead_conditions}
        GROUP BY l.owner
    """, as_dict=True)

    data = []
    for stat in lead_stats:
        emp = frappe.db.get_value(
            "Employee",
            {"user_id": stat.user_id},
            ["name", "employee_name", "branch", "custom_region", "custom_zone"],
            as_dict=True
        )
        if not emp:
            continue

        raw_rate = (stat.converted_leads / stat.total_leads) * 100 if stat.total_leads else 0
        conversion_rate = round(raw_rate, 2)

        # Assign color
        if conversion_rate >= 70:
            color = "green"
        elif conversion_rate >= 40:
            color = "orange"
        else:
            color = "red"

        color_html = f"<span style='color:{color}; font-weight:bold'>{conversion_rate}%</span>"

        data.append({
            "name": emp.name,
            "employee_name": emp.employee_name,
            "branch": emp.branch,
            "custom_region": emp.custom_region,
            "custom_zone": emp.custom_zone,
            "total_leads": stat.total_leads,
            "converted_leads": stat.converted_leads,
            "conversion_rate": color_html,
        })

    # Sort by raw conversion rate descending
    data.sort(key=lambda x: float(x["conversion_rate"].split('>')[1].split('%')[0]), reverse=True)

    columns = [
        {"label": "Employee ID", "fieldname": "name", "fieldtype": "Link", "options": "Employee", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 220},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Link", "options": "Branch", "width": 120},
        {"label": "Region", "fieldname": "custom_region", "fieldtype": "Link", "options": "Region", "width": 120},
        {"label": "Zone", "fieldname": "custom_zone", "fieldtype": "Link", "options": "Zone", "width": 120},
        {"label": "Total Leads", "fieldname": "total_leads", "fieldtype": "Int", "width": 100},
        {"label": "Converted Leads", "fieldname": "converted_leads", "fieldtype": "Int", "width": 140},
        {"label": "Conversion Rate (%)", "fieldname": "conversion_rate", "fieldtype": "HTML", "width": 180},
    ]

    return columns, data
