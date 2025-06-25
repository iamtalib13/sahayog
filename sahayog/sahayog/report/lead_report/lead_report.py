# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    user = frappe.session.user
    roles = frappe.get_roles(user)

    lead_filters = {}

    # Get linked Employee record for current user
    employee = frappe.db.get_value("Employee", {"user_id": user}, ["name", "branch", "custom_zone", "custom_region"], as_dict=True)

    # Admin/Full Access
    if "Administrator" in roles or "System Manager" in roles or "Admin" in roles:
        pass  # no filters applied

    elif "Branch Manager" in roles:
        if employee and employee.branch:
            lead_filters["custom_branch"] = employee.branch
        else:
            frappe.throw("No Branch found in your Employee profile.")

    elif "Zonal Manager" in roles:
        if employee and employee.custom_zone:
            lead_filters["custom_zone"] = employee.custom_zone
        else:
            frappe.throw("No Zone found in your Employee profile.")

    elif "Regional Manager" in roles:
        if employee and employee.custom_region:
            lead_filters["custom_region"] = employee.custom_region
        else:
            frappe.throw("No Region found in your Employee profile.")

    # Fetch Leads
    leads = frappe.db.get_all("Lead",
        filters=lead_filters,
        fields=[
            "name", "lead_name", "status",
            "custom_branch", "custom_zone", "custom_region",
            "creation", "lead_owner"
        ]
    )

    # Enhance data with full user name
    for lead in leads:
        if lead.get("lead_owner"):
            full_name = frappe.db.get_value("User", lead["lead_owner"], "full_name")
            lead["employee_name"] = full_name or lead["lead_owner"]
        else:
            lead["employee_name"] = ""

    # Define report columns
    columns = [
        {"label": "Lead Name", "fieldname": "lead_name", "fieldtype": "Data", "width": 200},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
        {"label": "Branch", "fieldname": "custom_branch", "fieldtype": "Link", "options": "Branch", "width": 150},
        {"label": "Zone", "fieldname": "custom_zone", "fieldtype": "Link", "options": "Zone", "width": 150},
        {"label": "Region", "fieldname": "custom_region", "fieldtype": "Link", "options": "Region", "width": 150},
        {"label": "Created On", "fieldname": "creation", "fieldtype": "Datetime", "width": 170},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 220},
    ]

    return columns, leads
