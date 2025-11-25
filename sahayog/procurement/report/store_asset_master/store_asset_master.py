import frappe

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters or {})
    return columns, data


# ---------------------------------------------------------
# REPORT COLUMNS
# ---------------------------------------------------------
def get_columns():
    return [
        {"fieldname": "name", "label": "Asset ID", "fieldtype": "Link", "options": "Asset", "width": 140},
        {"fieldname": "asset_name", "label": "Asset Name", "fieldtype": "Data", "width": 180},

        {"fieldname": "item_code", "label": "Item Code", "fieldtype": "Link", "options": "Item", "width": 120},

        {"fieldname": "location", "label": "Branch Code", "fieldtype": "Link", "options": "Location", "width": 130},

        # FROM SAHAYOG BRANCH
        {"fieldname": "branch", "label": "Branch Name", "fieldtype": "Data", "width": 160},
        {"fieldname": "zone", "label": "Zone", "fieldtype": "Data", "width": 140},
            {"fieldname": "state", "label": "State", "fieldtype": "Data", "width": 120},

        {"fieldname": "custodian", "label": "Employee ID", "fieldtype": "Link", "options": "Employee", "width": 140},

        # NEW: EMPLOYEE NAME
        {"fieldname": "employee_name", "label": "Employee Name", "fieldtype": "Data", "width": 180},

        {"fieldname": "purchase_date", "label": "Purchase Date", "fieldtype": "Date", "width": 120},
        {"fieldname": "available_for_use_date", "label": "Available For Use", "fieldtype": "Date", "width": 140},

        {"fieldname": "status", "label": "Status", "fieldtype": "Data", "width": 120},
    ]


# ---------------------------------------------------------
# FETCH DATA
# ---------------------------------------------------------
def get_data(filters):

    conditions = build_conditions(filters)

    query = f"""
        SELECT
            a.name,
            a.asset_name,
            a.item_code,

            a.location,

            sb.branch,
            sb.zone,
            sb.state,

            a.custodian,
            e.employee_name AS employee_name,

            a.purchase_date,
            a.available_for_use_date,

            a.status
        FROM
            `tabAsset` a
        LEFT JOIN
            `tabSahayog Branch` sb ON sb.name = a.location
        LEFT JOIN
            `tabEmployee` e ON e.employee_number = a.custodian
        WHERE
            a.docstatus < 2
            {conditions}
        ORDER BY a.name DESC
    """

    return frappe.db.sql(query, filters, as_dict=True)


# ---------------------------------------------------------
# BUILD FILTER CONDITIONS
# ---------------------------------------------------------
def build_conditions(filters):
    conditions = ""

    if filters.get("custodian"):
        conditions += " AND a.custodian = %(custodian)s"
    if filters.get("location"):
        conditions += " AND a.location = %(location)s"
    if filters.get("status"):
        conditions += " AND a.status = %(status)s"

    return conditions

import frappe

@frappe.whitelist()
def get_lead_tree():
    tree = {}
    
    # fetch all required fields in a single query for performance
    leads = frappe.db.get_all(
        "Lead",
        fields=[
            "custom_zone",
            "custom_region",
            "custom_branch",
            "name",
            "lead_name",
            "status",
            "lead_owner",

        ],
        order_by="custom_zone, custom_region, custom_branch"
    )
    
    for row in leads:
        zone = row.custom_zone or "Unknown Zone"
        region = row.custom_region or "Unknown Region"
        branch = row.custom_branch or "Unknown Branch"

        # create levels if they don't exist
        tree.setdefault(zone, {})
        tree[zone].setdefault(region, {})
        tree[zone][region].setdefault(branch, [])

        # append lead record
        tree[zone][region][branch].append({
            "name": row.name,
            "lead_name": row.lead_name,
            "status": row.status,
            "lead_owner": row.lead_owner,
        })

    return tree


import frappe

@frappe.whitelist()
def get_employees_by_branch():
    """
    Returns:
    {
        "Branch-1": [ {emp_name, emp_id}, ... ],
        "Branch-2": [ ... ],
        ...
    }
    """

    data = frappe.db.get_all(
        "Employee",
        fields=["name as emp_id", "employee_name", "branch"],
        order_by="branch asc"
    )

    result = {}

    for row in data:
        branch = row.branch or "Unknown Branch"

        result.setdefault(branch, [])
        result[branch].append({
            "emp_id": row.emp_id,
            "employee_name": row.employee_name
        })

    return result
@frappe.whitelist()
def get_active_nonactive_users():
    leads = frappe.db.get_all(
        "Lead",
        fields=["custom_zone","custom_region","custom_branch","name",
                "lead_name","status","lead_owner"],
        order_by="custom_zone, custom_region, custom_branch"
    )

    employees = frappe.db.get_all(
        "Employee",
        fields=["name as emp_id", "employee_name", "branch", "date_of_joining"],
        order_by="branch asc"
    )

    # Map employees by ID
    emp_map = {emp.emp_id: emp for emp in employees}

    # ACTIVE employee unique list
    active_emp_unique = set()

    # Build active lead tree
    active = {}
    for row in leads:
        zone = row.custom_zone or "Unknown Zone"
        region = row.custom_region or "Unknown Region"
        branch = row.custom_branch or "Unknown Branch"

        if row.lead_owner:
            active_emp_unique.add(row.lead_owner)

        active.setdefault(zone, {})
        active[zone].setdefault(region, {})
        active[zone][region].setdefault(branch, [])

        active[zone][region][branch].append({
            "lead_id": row.name,
            "lead_name": row.lead_name,
            "status": row.status,
            "lead_owner": row.lead_owner,
            "employee_joining_date": emp_map.get(row.lead_owner, {}).date_of_joining
            if row.lead_owner in emp_map else None
        })

    # NON-ACTIVE (employees NOT in active_emp_unique)
    nonactive = {}
    for emp in employees:
        if emp.emp_id not in active_emp_unique:
            zone = "Unknown Zone"
            region = "Unknown Region"
            branch = emp.branch or "Unknown Branch"

            nonactive.setdefault(zone, {})
            nonactive[zone].setdefault(region, {})
            nonactive[zone][region].setdefault(branch, [])

            nonactive[zone][region][branch].append({
                "emp_id": emp.emp_id,
                "employee_name": emp.employee_name,
                "date_of_joining": emp.date_of_joining
            })

    return {
        "active_users": active,
        "non_active_users": nonactive,
        "unique_active_employees": list(active_emp_unique)
    }
