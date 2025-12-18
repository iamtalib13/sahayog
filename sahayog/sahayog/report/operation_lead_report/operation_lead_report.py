import frappe
from frappe.utils import format_datetime


# --------------------------------------------------
# UTILITY
# --------------------------------------------------
def normalize_sol(sol):
    try:
        return int(sol)
    except:
        return None


def execute(filters=None):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    filters = filters or {}
    lead_filters = {}

    # --------------------------------------------------
    # PERMISSION CHECK
    # --------------------------------------------------
    allowed_roles = {
        "Administrator",
        "System Manager",
        "Sales Manager",
        "Operations Support Manager"
    }

    if not any(role in roles for role in allowed_roles):
        frappe.throw(
            "You do not have permission to view this report.",
            frappe.PermissionError
        )

    # --------------------------------------------------
    # OPERATION LEADS ONLY
    # --------------------------------------------------
    lead_filters["custom_is_operation_lead"] = 1

    # --------------------------------------------------
    # DATE FILTER (MANDATORY)
    # --------------------------------------------------
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    if not from_date or not to_date:
        frappe.throw("Both From Date and To Date are required.")

    lead_filters["creation"] = ["between", [from_date, to_date]]

    # --------------------------------------------------
    # FETCH LEADS
    # --------------------------------------------------
    leads = frappe.db.get_all(
        "Lead",
        filters=lead_filters,
        fields=[
            "name",
            "lead_name",
            "status",
            "source",
            "creation",
            "owner",
            "lead_owner",
            "phone",
            "email_id"
        ]
    )

    if not leads:
        return [], []

    # --------------------------------------------------
    # COLLECT USER IDS (OWNER + ASSIGNED)
    # --------------------------------------------------
    user_ids = set()
    for l in leads:
        if l.owner:
            user_ids.add(l.owner)
        if l.lead_owner:
            user_ids.add(l.lead_owner)

    # --------------------------------------------------
    # FETCH EMPLOYEES
    # --------------------------------------------------
    employees = frappe.db.get_all(
        "Employee",
        filters={"user_id": ["in", list(user_ids)]},
        fields=[
            "user_id",
            "employee_name",
            "employee_number",
            "designation",
            "sol_id"
        ]
    )

    employee_map = {e.user_id: e for e in employees}

    # --------------------------------------------------
    # FETCH SAHAYOG BRANCH MASTER
    # --------------------------------------------------
    sahayog_branches = frappe.db.get_all(
        "Sahayog Branch",
        fields=[
            "sol_id",
            "branch",
            "zone",
            "region",
            "district",
            "state"
        ]
    )

    # SOL → Branch Map (NORMALIZED)
    sol_branch_map = {}
    for b in sahayog_branches:
        sol = normalize_sol(b.sol_id)
        if sol:
            sol_branch_map[sol] = b

    # --------------------------------------------------
    # HELPER: BRANCH DETAILS
    # --------------------------------------------------
    def get_branch_details(emp):
        if not emp or not emp.sol_id:
            return "-", "-", "-", "-", "-"

        sol = normalize_sol(emp.sol_id)
        if not sol:
            return "-", "-", "-", "-", "-"

        sb = sol_branch_map.get(sol)
        if not sb:
            return sol, "-", "-", "-", "-"

        return (
            sol,
            sb.branch or "-",
            sb.zone or "-",
            sb.region or "-",
            sb.district or "-"
        )

    # --------------------------------------------------
    # BUILD REPORT DATA
    # --------------------------------------------------
    data = []

    for lead in leads:
        owner_emp = employee_map.get(lead.owner)
        assigned_emp = employee_map.get(lead.lead_owner)

        owner_sol, owner_branch, owner_zone, owner_region, owner_district = get_branch_details(owner_emp)
        assigned_sol, assigned_branch, assigned_zone, assigned_region, assigned_district = get_branch_details(assigned_emp)

        data.append({
            "lead_id": lead.name,
            "customer": lead.lead_name or "-",
            "status": lead.status,
            "source": lead.source or "-",
            "contact": lead.phone or lead.email_id or "-",

            # OWNER DETAILS
            "owner_name": owner_emp.employee_name if owner_emp else lead.owner or "-",
            "owner_emp_id": owner_emp.employee_number if owner_emp else "-",
            "owner_designation": owner_emp.designation if owner_emp and owner_emp.designation else "-",
            "owner_sol_id": owner_sol,
            "owner_branch": owner_branch,
            "owner_zone": owner_zone,
            "owner_region": owner_region,
            "owner_district": owner_district,

            # ASSIGNED DETAILS
            "assigned_name": assigned_emp.employee_name if assigned_emp else lead.lead_owner or "-",
            "assigned_emp_id": assigned_emp.employee_number if assigned_emp else "-",
            "assigned_designation": assigned_emp.designation if assigned_emp and assigned_emp.designation else "-",
            "assigned_sol_id": assigned_sol,
            "assigned_branch": assigned_branch,
            "assigned_zone": assigned_zone,
            "assigned_region": assigned_region,
            "assigned_district": assigned_district,

            "created_on": format_datetime(lead.creation, "MMM dd, yyyy hh:mm a")
        })

    # --------------------------------------------------
    # COLUMNS
    # --------------------------------------------------
    columns = [
        {"label": "Lead ID", "fieldname": "lead_id", "fieldtype": "Link", "options": "Lead", "width": 120},
        {"label": "Customer", "fieldname": "customer", "width": 160},
        {"label": "Status", "fieldname": "status", "width": 100},
        {"label": "Source", "fieldname": "source", "width": 120},
        {"label": "Contact", "fieldname": "contact", "width": 120},

        {"label": "Owner Name", "fieldname": "owner_name", "width": 160},
        {"label": "Owner Emp ID", "fieldname": "owner_emp_id", "width": 120},
        {"label": "Owner Designation", "fieldname": "owner_designation", "width": 140},
        {"label": "Owner SOL ID", "fieldname": "owner_sol_id", "width": 110},
        {"label": "Owner Branch", "fieldname": "owner_branch", "width": 140},
        {"label": "Owner Zone", "fieldname": "owner_zone", "width": 120},
        {"label": "Owner Region", "fieldname": "owner_region", "width": 120},
        {"label": "Owner District", "fieldname": "owner_district", "width": 120},

        {"label": "Assigned Name", "fieldname": "assigned_name", "width": 160},
        {"label": "Assigned Emp ID", "fieldname": "assigned_emp_id", "width": 120},
        {"label": "Assigned Designation", "fieldname": "assigned_designation", "width": 140},
        {"label": "Assigned SOL ID", "fieldname": "assigned_sol_id", "width": 110},
        {"label": "Assigned Branch", "fieldname": "assigned_branch", "width": 140},
        {"label": "Assigned Zone", "fieldname": "assigned_zone", "width": 120},
        {"label": "Assigned Region", "fieldname": "assigned_region", "width": 120},
        {"label": "Assigned District", "fieldname": "assigned_district", "width": 120},

        {"label": "Created On", "fieldname": "created_on", "width": 160},
    ]

    return columns, data
