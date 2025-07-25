import frappe
from frappe.utils import format_datetime

def execute(filters=None):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    filters = filters or {}
    lead_filters = {}

    unrestricted_roles = {"Administrator", "System Manager", "Admin", "Sales Manager"}

    # 🔐 Apply role-based filtering
    if not any(role in roles for role in unrestricted_roles):
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "branch", "custom_zone", "custom_region"],
            as_dict=True
        )

        if not employee:
            frappe.throw(f"Employee record not found for user: {user}")

        if "Branch Manager" in roles and employee.branch:
            lead_filters["custom_branch"] = employee.branch

        elif "Regional Manager" in roles and employee.custom_region and employee.custom_zone:
            lead_filters["custom_region"] = employee.custom_region
            lead_filters["custom_zone"] = employee.custom_zone

        elif "Zonal Manager" in roles and employee.custom_zone:
            lead_filters["custom_zone"] = employee.custom_zone

        else:
            frappe.throw("Your Employee record is missing branch, region, or zone info.")

    # 📅 Required date filter
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    if from_date and to_date:
        lead_filters["creation"] = ["between", [from_date, to_date]]
    else:
        frappe.throw("Both From Date and To Date are required.")

    # 📦 Fetch leads
    leads = frappe.db.get_all(
        "Lead",
        filters=lead_filters,
        fields=[
            "name", "lead_name", "status", "source",
            "custom_branch", "custom_zone", "custom_region",
            "creation", "lead_owner"
        ]
    )

    # 👤 Add employee info
    for lead in leads:
        lead_owner = lead.get("lead_owner")
        lead["employee_name"] = frappe.db.get_value("User", lead_owner, "full_name") or lead_owner or ""

        designation = frappe.db.get_value("Employee", {"user_id": lead_owner}, "designation")
        lead["designation"] = designation or ""

        if lead.get("creation"):
            lead["creation"] = format_datetime(lead["creation"], "MMM dd, yyyy hh:mm a")

    # 📊 Columns for report
    columns = [
        {"label": "Lead Name", "fieldname": "lead_name", "fieldtype": "Data", "width": 200},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
        {"label": "Source", "fieldname": "source", "fieldtype": "Data", "width": 150},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 220},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 180},
        {"label": "Branch", "fieldname": "custom_branch", "fieldtype": "Link", "options": "Branch", "width": 150},
        {"label": "Region", "fieldname": "custom_region", "fieldtype": "Link", "options": "Region", "width": 120},
        {"label": "Zone", "fieldname": "custom_zone", "fieldtype": "Link", "options": "Zone", "width": 120},
        {"label": "Created On", "fieldname": "creation", "fieldtype": "Data", "width": 180},
    ]

    return columns, leads
