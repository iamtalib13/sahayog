# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt
from frappe.utils import format_datetime
import frappe

def execute(filters=None):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    filters = filters or {}

    lead_filters = {}

    # ✅ Define unrestricted roles
    unrestricted_roles = {"Administrator", "System Manager", "Admin", "Sales Manager"}

    # ✅ Skip Employee check for unrestricted roles
    if not any(role in roles for role in unrestricted_roles):
        # Get linked Employee record only for restricted users
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "branch", "custom_zone", "custom_region"],
            as_dict=True
        )

        if not employee:
            frappe.throw(f"Employee record not found for user: {user}")

        # Role-based filtering
        if "Branch Manager" in roles and employee.branch:
            lead_filters["custom_branch"] = employee.branch
        elif "Zonal Manager" in roles and employee.custom_zone:
            lead_filters["custom_zone"] = employee.custom_zone
        elif "Regional Manager" in roles and employee.custom_region:
            lead_filters["custom_region"] = employee.custom_region
        else:
            frappe.throw("Your Employee record is missing branch/zone/region info.")

    # ✅ Apply manual filters (for everyone)
    if filters.get("custom_branch"):
        lead_filters["custom_branch"] = filters["custom_branch"]
    if filters.get("custom_zone"):
        lead_filters["custom_zone"] = filters["custom_zone"]
    if filters.get("custom_region"):
        lead_filters["custom_region"] = filters["custom_region"]

    # ✅ Date range filter
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    if from_date and to_date:
        lead_filters["creation"] = ["between", [from_date, to_date]]

    # ✅ Fetch lead data
    leads = frappe.db.get_all("Lead",
        filters=lead_filters,
        fields=[
            "name", "lead_name", "status", "source",
            "custom_branch", "custom_zone", "custom_region",
            "creation", "lead_owner"
        ]
    )

    # ✅ Format data
    for lead in leads:
        full_name = frappe.db.get_value("User", lead["lead_owner"], "full_name") if lead.get("lead_owner") else ""
        lead["employee_name"] = full_name or lead.get("lead_owner") or ""

        if lead.get("creation"):
            lead["creation"] = format_datetime(lead["creation"], "MMM dd, yyyy hh:mm a")

    # ✅ Report columns
    columns = [
        {"label": "Lead Name", "fieldname": "lead_name", "fieldtype": "Data", "width": 200},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
        {"label": "Source", "fieldname": "source", "fieldtype": "Data", "width": 150},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 220},
        {"label": "Branch", "fieldname": "custom_branch", "fieldtype": "Link", "options": "Branch", "width": 150},
        {"label": "Region", "fieldname": "custom_region", "fieldtype": "Link", "options": "Region", "width": 120},
        {"label": "Zone", "fieldname": "custom_zone", "fieldtype": "Link", "options": "Zone", "width": 120},
        {"label": "Created On", "fieldname": "creation", "fieldtype": "Data", "width": 180},
    ]

    return columns, leads
