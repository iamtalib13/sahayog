import datetime

import frappe
from frappe.utils import getdate, nowdate


# ---------------------------------------------------------
# NORMALIZE EMPLOYEE ID (NT7177 → 7177)
# ---------------------------------------------------------
def normalize_emp_id(emp_id):
    """Return only numeric part from employee ID (e.g., NT7177 → 7177)."""
    return "".join(filter(str.isdigit, emp_id or ""))


def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    chart = get_chart_based_on_filters(data, filters)
    return columns, data, None, chart


# ---------------------------------------------------------
# COLUMNS
# ---------------------------------------------------------
def get_columns():
    return [
        {
            "label": "Employee ID",
            "fieldname": "emp_id",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": "Employee Name",
            "fieldname": "employee_name",
            "fieldtype": "Data",
            "width": 200,
        },
        {
            "label": "Status",
            "fieldname": "status_html",
            "fieldtype": "HTML",
            "width": 120,
        },
        {
            "label": "Sol ID",
            "fieldname": "sol_id",
            "fieldtype": "Data",
            "width": 100,
        },
        {
            "label": "Branch",
            "fieldname": "branch",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": "Zone",
            "fieldname": "zone",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": "Region",
            "fieldname": "region",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": "State",
            "fieldname": "state",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": "District",
            "fieldname": "district",
            "fieldtype": "Data",
            "width": 120,
        },
        # {
        #     "label": "Joining Date",
        #     "fieldname": "date_of_joining",
        #     "fieldtype": "Date",
        #     "width": 120,
        # },
        # {
        #     "label": "Employee Creation Date",
        #     "fieldname": "creation_date",
        #     "fieldtype": "Date",
        #     "width": 140,
        # },
        # {
        #     "label": "Days Since Joining",
        #     "fieldname": "days_since_joining",
        #     "fieldtype": "Int",
        #     "width": 130,
        # },
        {
            "label": "Total Leads",
            "fieldname": "lead_count",
            "fieldtype": "Int",
            "width": 100,
        },
    ]


# ---------------------------------------------------------
# DATA LOGIC
# ---------------------------------------------------------
def get_data(filters=None):
    # Convert date filter to proper date object
    if filters:
        if filters.get("selected_date") and isinstance(filters["selected_date"], str):
            filters["selected_date"] = datetime.datetime.strptime(
                filters["selected_date"], "%Y-%m-%d"
            ).date()

    today = getdate(nowdate())

    # Prevent future dates
    if filters:
        if filters.get("selected_date") and filters["selected_date"] > today:
            frappe.throw("Selected Date cannot be in the future.")

    # Fetch leads
    leads = frappe.db.get_all(
        "Lead", fields=["name", "lead_name", "status", "lead_owner"], order_by="name"
    )

    # Fetch employees including creation date
    employees = frappe.db.get_all(
        "Employee",
        fields=[
            "name as emp_id",
            "employee_name",
            "sol_id",
            "date_of_joining",
            "creation as creation_date",
            "department",
        ],
        order_by="sol_id asc",
    )

    all_employees = employees[:]

    # Only Sales + Operations employees for non-active
    sales_ops_employees = [
        emp for emp in employees if emp.get("department") in ("Sales", "Operations")
    ]

    sahayog_branches = frappe.db.get_all(
        "Sahayog Branch",
        fields=["sol_id", "zone", "region", "state", "district", "branch"],
    )

    branch_map = {str(b["sol_id"]).strip(): b for b in sahayog_branches}
    emp_map = {normalize_emp_id(emp["emp_id"]): emp for emp in all_employees}

    # Group leads by employee
    emp_leads = {}
    for row in leads:
        nid = normalize_emp_id(row["lead_owner"])
        if not nid:
            continue
        emp_leads.setdefault(nid, {"leads": []})["leads"].append(row)

    report_rows = []
    active_emp_ids = set()

    # Non active lookup
    non_active_emp_info = {}
    for emp in all_employees:
        nid = normalize_emp_id(emp["emp_id"])
        if nid not in emp_leads:
            non_active_emp_info[nid] = emp

    # ------------------------------
    # ACTIVE EMPLOYEES
    # ------------------------------
    for emp_id in emp_leads:
        numeric_id = normalize_emp_id(emp_id)
        emp_ref = emp_map.get(numeric_id)

        if emp_ref:
            employee_name = emp_ref["employee_name"]
            date_of_joining = emp_ref["date_of_joining"]
            sol_id = str(emp_ref.get("sol_id")).strip()
            creation_date = emp_ref.get("creation_date")
        else:
            employee_name = "Unknown"
            date_of_joining = None
            sol_id = None
            creation_date = None

        branch_data = branch_map.get(sol_id, {})
        days_since_joining = (today - date_of_joining).days if date_of_joining else 0

        report_rows.append(
            {
                "emp_id": numeric_id,
                "employee_name": employee_name,
                "sol_id": sol_id,
                "zone": branch_data.get("zone", ""),
                "region": branch_data.get("region", ""),
                "state": branch_data.get("state", ""),
                "district": branch_data.get("district", ""),
                "branch": branch_data.get("branch", ""),
                "date_of_joining": date_of_joining,
                "creation_date": creation_date,
                "days_since_joining": days_since_joining,
                "lead_count": len(emp_leads[numeric_id]["leads"]),
                "status": "Active",
                "status_html": (
                    "<div style='display:inline-flex; align-items:center; gap:6px; "
                    "padding:0px 14px; background:#4caf50; border:2px solid #4caf50; "
                    "color:#ffffff; font-weight:400; border-radius:10px;'>ACTIVE</div>"
                ),
            }
        )

        active_emp_ids.add(numeric_id)

    # ------------------------------
    # NON-ACTIVE EMPLOYEES
    # ------------------------------
    for emp in sales_ops_employees:
        nid = normalize_emp_id(emp["emp_id"])

        if nid not in active_emp_ids:
            sol_id = str(emp.get("sol_id")).strip()
            days_since_joining = (
                (today - emp["date_of_joining"]).days if emp["date_of_joining"] else 0
            )
            branch_data = branch_map.get(sol_id, {})

            report_rows.append(
                {
                    "emp_id": nid,
                    "employee_name": emp["employee_name"],
                    "sol_id": sol_id,
                    "zone": branch_data.get("zone", ""),
                    "region": branch_data.get("region", ""),
                    "state": branch_data.get("state", ""),
                    "district": branch_data.get("district", ""),
                    "branch": branch_data.get("branch", ""),
                    "date_of_joining": emp["date_of_joining"],
                    "creation_date": emp.get("creation_date"),
                    "days_since_joining": days_since_joining,
                    "lead_count": 0,
                    "status": "Non-Active",
                    "status_html": (
                        "<div style='display:inline-flex; align-items:center; gap:6px; "
                        "padding:0px 14px; background:#F18F01; border:2px solid #F18F01; "
                        "color:#ffffff; font-weight:400; border-radius:10px;'>INACTIVE</div>"
                    ),
                }
            )

    # FILTERING
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

            # SINGLE DATE FILTER - Show only records created on the selected date
            if filters.get("selected_date") and row.get("creation_date"):
                if row.get("creation_date").date() != filters.get("selected_date"):
                    show = False

            if show:
                filtered.append(row)

        return filtered

    return report_rows


# ---------------------------------------------------------
# CHART LOGIC
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

            group_status_users.setdefault(
                group_val, {"Active": set(), "Non-Active": set()}
            )

            group_status_users[group_val][status].add(emp_id)

        valid_groups = [
            g for g in group_status_users.keys()
            if str(g).strip() and not str(g).lower().startswith("unknown")
        ]

        labels = sorted(valid_groups)
        active_counts = [len(group_status_users[g]["Active"]) for g in labels]
        non_active_counts = [len(group_status_users[g]["Non-Active"]) for g in labels]

        return {
            "data": {
                "labels": labels,
                "datasets": [
                    {"name": "Active Users", "values": active_counts},
                    {"name": "Non-Active Users", "values": non_active_counts},
                ],
            },
            "type": "bar",
            "colors": ["#62B58F", "#F18F01"],
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