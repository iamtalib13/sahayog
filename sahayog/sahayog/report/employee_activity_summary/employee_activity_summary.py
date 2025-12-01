# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe


# ---------------------------------------------------------
# NORMALIZE EMPLOYEE ID  (NT7177 → 7177)
# ---------------------------------------------------------
def normalize_emp_id(emp_id):
    """Return only numeric part from employee ID (e.g., NT7177 → 7177)."""
    return "".join(filter(str.isdigit, emp_id or ""))


def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    chart = get_chart_based_on_filters(data, filters)
    return columns, data, None, chart


def get_columns():
    return [
        {"label": "Employee ID", "fieldname": "emp_id", "fieldtype": "Data", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 200},
        {"label": "Sol ID", "fieldname": "sol_id", "fieldtype": "Data", "width": 100},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 120},
        {"label": "Region", "fieldname": "region", "fieldtype": "Data", "width": 120},
        {"label": "State", "fieldname": "state", "fieldtype": "Data", "width": 120},
        {"label": "District", "fieldname": "district", "fieldtype": "Data", "width": 120},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 120},
        {"label": "Joining Date", "fieldname": "date_of_joining", "fieldtype": "Date", "width": 120},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
        {"label": "Total Leads", "fieldname": "lead_count", "fieldtype": "Int", "width": 100},
        {"label": "Lead Names", "fieldname": "lead_names", "fieldtype": "Data", "width": 250},
    ]


def get_data(filters=None):
    from frappe.utils import getdate, nowdate
    import datetime

    # ------------------------------------------------
    # STEP 1: Convert filter strings to date
    # ------------------------------------------------
    if filters:
        if filters.get("from_date") and isinstance(filters["from_date"], str):
            filters["from_date"] = datetime.datetime.strptime(filters["from_date"], "%Y-%m-%d").date()

        if filters.get("to_date") and isinstance(filters["to_date"], str):
            filters["to_date"] = datetime.datetime.strptime(filters["to_date"], "%Y-%m-%d").date()

    # ------------------------------------------------
    # STEP 2: Prevent future dates
    # ------------------------------------------------
    today = getdate(nowdate())
    if filters:
        if filters.get("from_date") and filters["from_date"] > today:
            frappe.throw("❌ From Date cannot be in the future.")
        if filters.get("to_date") and filters["to_date"] > today:
            frappe.throw("❌ To Date cannot be in the future.")

    # ------------------------------------------------
    # Fetch Leads
    # ------------------------------------------------
    leads = frappe.db.get_all(
        "Lead",
        fields=["name", "lead_name", "status", "lead_owner"],
        order_by="name"
    )

    # ------------------------------------------------
    # Fetch ALL Employees (NO department filter here)
    # ------------------------------------------------
    employees = frappe.db.get_all(
        "Employee",
        fields=["name as emp_id", "employee_name", "sol_id", "date_of_joining", "department"],
        order_by="sol_id asc"
    )

    # Keep full list
    all_employees = employees[:]  

    # Keep only Sales/Operations for NON-ACTIVE filter stage
    sales_ops_employees = [emp for emp in employees if emp.get("department") in ("Sales", "Operations")]

    # ------------------------------------------------
    # Fetch Branch Mapping
    # ------------------------------------------------
    sahayog_branches = frappe.db.get_all(
        "Sahayog Branch",
        fields=["sol_id", "zone", "region", "state", "district", "branch"]
    )

    branch_map = {str(b["sol_id"]).strip(): b for b in sahayog_branches if b.get("sol_id")}

    # EMPLOYEE MAP USING NORMALIZED ID
    emp_map = {normalize_emp_id(emp["emp_id"]): emp for emp in all_employees}

    # ------------------------------------------------
    # Group Leads by Employee
    # ------------------------------------------------
    emp_leads = {}
    for row in leads:
        normalized_id = normalize_emp_id(row["lead_owner"])
        if not normalized_id:
            continue
        if normalized_id not in emp_leads:
            emp_leads[normalized_id] = {"leads": []}
        emp_leads[normalized_id]["leads"].append(row)

    # ------------------------------------------------
    # Prepare Report Rows
    # ------------------------------------------------
    report_rows = []
    active_emp_ids = set()

    # Find non-active from full list
    non_active_emp_info = {}
    for emp in all_employees:
        nid = normalize_emp_id(emp["emp_id"])
        if nid not in emp_leads:
            non_active_emp_info[nid] = {
                "employee_name": emp["employee_name"],
                "date_of_joining": emp["date_of_joining"],
                "sol_id": str(emp.get("sol_id")).strip(),
                "department": emp.get("department")
            }

    # ------------------------------------------------
    # ACTIVE EMPLOYEES — ALWAYS SHOW
    # ------------------------------------------------
    for emp_id, info in emp_leads.items():

        numeric_id = normalize_emp_id(emp_id)
        emp_ref = emp_map.get(numeric_id)
        non_active_info = non_active_emp_info.get(numeric_id)

        if non_active_info:
            employee_name = non_active_info["employee_name"]
            date_of_joining = non_active_info["date_of_joining"]
            sol_id = non_active_info["sol_id"]

        elif emp_ref:
            employee_name = emp_ref["employee_name"]
            date_of_joining = emp_ref["date_of_joining"]
            sol_id = str(emp_ref.get("sol_id")).strip()

        else:
            employee_name = "Unknown"
            date_of_joining = None
            sol_id = None

        branch_data = branch_map.get(sol_id, {})
        report_rows.append({
            "emp_id": numeric_id,
            "employee_name": employee_name,
            "sol_id": sol_id,
            "zone": branch_data.get("zone", "Unknown Zone"),
            "region": branch_data.get("region", "Unknown Region"),
            "state": branch_data.get("state", "Unknown State"),
            "district": branch_data.get("district", "Unknown District"),
            "branch": branch_data.get("branch", "Unknown Branch"),
            "date_of_joining": date_of_joining,
            "lead_count": len(info["leads"]),
            "lead_names": ", ".join([l["lead_name"] for l in info["leads"]]),
            "status": "Active",
        })

        active_emp_ids.add(numeric_id)

    # ------------------------------------------------
    # NON ACTIVE EMPLOYEES — ONLY SHOW Sales/Operations
    # ------------------------------------------------
    for emp in sales_ops_employees:
        nid = normalize_emp_id(emp["emp_id"])
        sol_id = str(emp.get("sol_id")).strip()

        if nid not in active_emp_ids:
            branch_data = branch_map.get(sol_id, {})
            report_rows.append({
                "emp_id": nid,
                "employee_name": emp["employee_name"],
                "sol_id": sol_id,
                "zone": branch_data.get("zone", "Unknown Zone"),
                "region": branch_data.get("region", "Unknown Region"),
                "state": branch_data.get("state", "Unknown State"),
                "district": branch_data.get("district", "Unknown District"),
                "branch": branch_data.get("branch", "Unknown Branch"),
                "date_of_joining": emp["date_of_joining"],
                "lead_count": 0,
                "lead_names": "",
                "status": "Non-Active",
            })

    # ------------------------------------------------
    # FILTERING (unchanged)
    # ------------------------------------------------
    if filters:
        filtered = []
        for row in report_rows:
            show = True
            if filters.get("sol_id") and str(row.get("sol_id")) != str(filters["sol_id"]):
                show = False
            if filters.get("zone") and row.get("zone") != filters["zone"]:
                show = False
            if filters.get("region") and row.get("region") != filters["region"]:
                show = False
            if filters.get("branch") and row.get("branch") != filters["branch"]:
                show = False
            if filters.get("status") and row.get("status") != filters["status"]:
                show = False

            if filters.get("from_date") and row.get("date_of_joining") and row.get("date_of_joining") < filters.get("from_date"):
                show = False
            if filters.get("to_date") and row.get("date_of_joining") and row.get("date_of_joining") > filters.get("to_date"):
                show = False

            if show:
                filtered.append(row)
        return filtered

    return report_rows


# ---------------------------------------------------------
# CHART LOGIC (Unchanged)
# ---------------------------------------------------------
def get_chart_based_on_filters(data, filters=None):

    def grouped_chart(group_field, label_name):
        group_status_users = {}
        for row in data:
            group_val = row.get(group_field, f"Unknown {label_name}")
            status = row.get("status", "Unknown")
            emp_id = row.get("emp_id")
            if not emp_id:
                continue
            if group_val not in group_status_users:
                group_status_users[group_val] = {"Active": set(), "Non-Active": set()}
            if status == "Active":
                group_status_users[group_val]["Active"].add(emp_id)
            elif status == "Non-Active":
                group_status_users[group_val]["Non-Active"].add(emp_id)

        labels = sorted(group_status_users.keys())
        active_counts = [len(group_status_users[g]["Active"]) for g in labels]
        non_active_counts = [len(group_status_users[g]["Non-Active"]) for g in labels]

        return {
            "data": {
                "labels": labels,
                "datasets": [
                    {"name": "Active Users", "values": active_counts},
                    {"name": "Non-Active Users", "values": non_active_counts}
                ]
            },
            "type": "bar",
            "colors": ["#62B58F", "#F18F01"]
        }

    if filters:
        if filters.get("branch"):
            return None
        if filters.get("sol_id"):
            return None
        if filters.get("zone") and not filters.get("region"):
            return None
        if filters.get("district"):
            return grouped_chart("branch", "Branch")
        if filters.get("region"):
            return grouped_chart("branch", "Branch")

    return grouped_chart("zone", "Zone")
