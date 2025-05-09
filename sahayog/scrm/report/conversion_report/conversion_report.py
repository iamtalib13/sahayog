# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import getdate

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {"label": "Employee ID", "fieldname": "employee_id", "fieldtype": "Data", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 300},
        {"label": "Branch", "fieldname": "custom_lead_owner_branch", "fieldtype": "Data", "width": 180},
        {"label": "Total Leads", "fieldname": "total_leads", "fieldtype": "Int", "width": 120},
        {"label": "Converted Leads", "fieldname": "converted_leads", "fieldtype": "Int", "width": 150},
        {"label": "Conversion Rate (%)", "fieldname": "conversion_rate", "fieldtype": "Percent", "width": 150}
    ]

def get_data(filters):
    conditions = ""
    
    # Apply date filter if specified
    if filters.get("from_date") and filters.get("to_date"):
        conditions += " AND t1.creation BETWEEN %(from_date)s AND %(to_date)s"

    # Fetch data from database
    data = frappe.db.sql(f"""
        SELECT 
            t1.lead_owner AS lead_owner,
            emp.employee_number AS employee_id,
            emp.employee_name AS employee_name,
            t1.custom_lead_owner_branch AS custom_lead_owner_branch,
            COUNT(t1.name) AS total_leads,
            SUM(CASE WHEN t1.converted = 1 THEN 1 ELSE 0 END) AS converted_leads,
            ROUND(SUM(CASE WHEN t1.converted = 1 THEN 1 ELSE 0 END) / COUNT(t1.name) * 100, 2) AS conversion_rate
        FROM 
            `tabCRM Lead` t1
        LEFT JOIN 
            `tabEmployee` emp ON emp.user_id = t1.lead_owner
        WHERE 
            1 = 1 {conditions}
        GROUP BY 
            t1.lead_owner, t1.custom_lead_owner_branch
        ORDER BY 
            conversion_rate DESC
    """, filters, as_dict=True)

    return data
