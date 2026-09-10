# Copyright (c) 2026, Sahayog and contributors
# For license information, please see license.txt

import frappe
from frappe import _
import json
from urllib.parse import quote_plus


DEPARTMENT_COLORS = {
    "Operations": {"accent": "#2563EB", "badge": "#EFF6FF", "badge_text": "#1E40AF"},
    "Sales": {"accent": "#10B981", "badge": "#ECFDF3", "badge_text": "#065F46"},
    "Credit": {"accent": "#F59E0B", "badge": "#FFFBEB", "badge_text": "#92400E"},
    "Collection": {"accent": "#EC4899", "badge": "#FDF2F8", "badge_text": "#9D174D"},
    "Collection And Recovery": {"accent": "#EC4899", "badge": "#FDF2F8", "badge_text": "#9D174D"},
    "Administration": {"accent": "#8B5CF6", "badge": "#F5F3FF", "badge_text": "#5B21B6"},
    "Human Resources": {"accent": "#A855F7", "badge": "#FAF5FF", "badge_text": "#6B21A8"},
    "Head Office": {"accent": "#6366F1", "badge": "#EEF2FF", "badge_text": "#3730A3"},
    "Learning And Development": {"accent": "#06B6D4", "badge": "#ECFEFF", "badge_text": "#155E75"},
    "Business Intelligence Unit": {"accent": "#0EA5E9", "badge": "#F0F9FF", "badge_text": "#0369A1"},
    "IT": {"accent": "#0284C7", "badge": "#F0F9FF", "badge_text": "#075985"},
    "Legal": {"accent": "#64748B", "badge": "#F8FAFC", "badge_text": "#334155"},
}

DEFAULT_COLOR = {"accent": "#64748B", "badge": "#F1F5F9", "badge_text": "#334155"}


def get_dept_style(department):
    if not department:
        return DEFAULT_COLOR
    for key, style in DEPARTMENT_COLORS.items():
        if key.lower() in department.lower() or department.lower() in key.lower():
            return style
    return DEFAULT_COLOR


def get_context(context):
    context.no_cache = 1
    context.safe_render = False
    context.title = "Sahayog Branch & Employee Hierarchy"

    # Get list of all branches for the branch selector
    branches = frappe.get_all(
        "Sahayog Branch",
        fields=["sol_id", "branch", "zone", "region", "district", "state"],
        order_by="branch asc",
        limit_page_length=2000,
    )
    context.all_branches = branches

    # Selected branch from query params or sensible default
    sol_id = frappe.form_dict.get("branch") or frappe.form_dict.get("sol_id")
    if not sol_id and branches:
        available_sol_ids = {b["sol_id"] for b in branches}
        if "1174" in available_sol_ids:
            sol_id = "1174"
        elif "1001" in available_sol_ids:
            sol_id = "1001"
        else:
            sol_id = branches[0]["sol_id"]

    context.selected_sol_id = sol_id or ""

    # Pre-fetch initial data
    if sol_id:
        hierarchy_res = get_branch_hierarchy_data(sol_id, view_mode="hierarchy", status_filter="Active")
        context.initial_tree = json.dumps(hierarchy_res.get("tree", {}))
        context.initial_branch = hierarchy_res.get("branch", {})
        context.initial_summary = hierarchy_res.get("summary", {})
    else:
        context.initial_tree = "{}"
        context.initial_branch = {}
        context.initial_summary = {}

    return context


@frappe.whitelist(allow_guest=True)
def get_branch_tree_data(sol_id, view_mode="hierarchy", status_filter="Active"):
    """Whitelisted endpoint to dynamically load branch employee tree for ApexTree."""
    try:
        data = get_branch_hierarchy_data(sol_id, view_mode=view_mode, status_filter=status_filter)
        return {"status": "success", "data": data}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Branch Master Tree API Error")
        return {"status": "error", "message": str(e)}


def get_branch_hierarchy_data(sol_id, view_mode="hierarchy", status_filter="Active"):
    if not sol_id:
        return {"branch": {}, "tree": {}, "summary": {}}

    branch_fields = [
        "name", "sol_id", "branch", "zone", "region", "district",
        "state", "state_code", "branch_code", "branch_address",
        "email", "branch_type", "branch_opening_date",
        "br_cash_retention_limit_crl"
    ]
    branch = frappe.db.get_value("Sahayog Branch", {"sol_id": sol_id}, branch_fields, as_dict=True)
    if not branch:
        branch = frappe.db.get_value("Sahayog Branch", sol_id, branch_fields, as_dict=True)
        if not branch:
            return {"branch": {}, "tree": {}, "summary": {}}

    if branch.get("branch_opening_date"):
        branch["branch_opening_date"] = str(branch["branch_opening_date"])
    if branch.get("br_cash_retention_limit_crl") is not None:
        branch["br_cash_retention_limit_crl"] = float(branch["br_cash_retention_limit_crl"])

    # Fetch employees belonging to this Sahayog Branch
    emp_filters = {"sahayog_branch": branch["sol_id"]}
    if status_filter == "Active":
        emp_filters["status"] = "Active"

    emp_fields = [
        "name", "employee_name", "designation", "department",
        "reports_to", "status", "image", "cell_number",
        "company_email", "personal_email", "date_of_joining",
        "gender", "branch"
    ]
    employees = frappe.get_all(
        "Employee",
        filters=emp_filters,
        fields=emp_fields,
        order_by="employee_name asc",
        limit_page_length=5000,
    )

    for emp in employees:
        if emp.get("date_of_joining"):
            emp["date_of_joining"] = str(emp["date_of_joining"])

    # Pre-fetch manager names for reports_to
    mgr_ids = {e["reports_to"] for e in employees if e.get("reports_to")}
    mgr_name_map = {}
    if mgr_ids:
        mgr_records = frappe.get_all(
            "Employee",
            filters={"name": ["in", list(mgr_ids)]},
            fields=["name", "employee_name", "designation"],
        )
        for m in mgr_records:
            mgr_name_map[m["name"]] = m

    for emp in employees:
        mgr_id = emp.get("reports_to")
        if mgr_id and mgr_id in mgr_name_map:
            emp["reports_to_name"] = mgr_name_map[mgr_id]["employee_name"]
            emp["reports_to_designation"] = mgr_name_map[mgr_id].get("designation", "")
        else:
            emp["reports_to_name"] = mgr_id or ""
            emp["reports_to_designation"] = ""

    # Summary and Legend
    departments_set = {}
    active_count = 0
    for emp in employees:
        dept = emp.get("department") or "Unassigned"
        departments_set[dept] = departments_set.get(dept, 0) + 1
        if emp.get("status") == "Active":
            active_count += 1

    legend = []
    for dept in sorted(departments_set.keys()):
        style = get_dept_style(dept)
        legend.append({
            "department": dept,
            "count": departments_set[dept],
            "accentColor": style["accent"],
            "badgeColor": style["badge"],
            "badgeText": style["badge_text"],
        })

    summary = {
        "total_employees": len(employees),
        "active_employees": active_count,
        "departments_count": len(departments_set),
        "legend": legend,
    }

    # Bank icon SVG for the branch root node
    bank_svg = (
        "data:image/svg+xml;utf8,"
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='48' height='48'>"
        "<rect width='24' height='24' rx='12' fill='%230F172A'/>"
        "<path d='M12 4L3 9v2h18V9L12 4zm-7 8v7h2v-7H5zm4 0v7h2v-7H9zm4 0v7h2v-7h-2zm4 0v7h2v-7h-2zM3 20v2h18v-2H3z' fill='%23FFFFFF'/>"
        "</svg>"
    )

    branch_title = f"SOL ID: {branch['sol_id']}"
    if branch.get("branch_type"):
        branch_title += f" • {branch['branch_type']}"

    branch_subtitle = ", ".join(
        filter(None, [branch.get("district"), branch.get("region"), branch.get("zone")])
    )

    branch_node = {
        "id": f"branch-{branch['sol_id']}",
        "data": {
            "imageURL": bank_svg,
            "name": f"{branch['branch']} ({branch['sol_id']})",
            "title": branch_title,
            "subtitle": branch_subtitle or "Sahayog Branch",
            "badge": {"text": branch.get("zone") or "BRANCH", "color": "#EEF2FF"},
            "accentColor": "#0F172A",
            "node_type": "branch",
            "branch_id": branch["sol_id"],
            "details": branch,
            "total_employees": len(employees),
            "active_employees": active_count,
        },
        "children": [],
    }

    def format_emp_node(e):
        style = get_dept_style(e.get("department"))
        name = e.get("employee_name") or e.get("name")
        avatar = e.get("image")
        if not avatar or not (avatar.startswith("http") or avatar.startswith("/")):
            avatar = f"https://api.dicebear.com/9.x/initials/svg?seed={quote_plus(name)}"

        status_text = e.get("status") or "Active"
        badge_bg = style["badge"] if status_text == "Active" else "#FEE2E2"

        return {
            "id": f"emp-{e['name']}",
            "data": {
                "imageURL": avatar,
                "name": name,
                "title": e.get("designation") or "Staff",
                "subtitle": e.get("department") or "Sahayog",
                "badge": {"text": status_text, "color": badge_bg},
                "accentColor": style["accent"],
                "node_type": "employee",
                "employee_id": e["name"],
                "details": e,
            },
            "children": [],
        }

    if view_mode == "department":
        dept_groups = {}
        for emp in employees:
            dept = emp.get("department") or "General"
            dept_groups.setdefault(dept, []).append(emp)

        for dept, dept_emps in sorted(dept_groups.items()):
            style = get_dept_style(dept)
            dept_node_id = f"dept-{branch['sol_id']}-{quote_plus(dept)}"
            dept_svg = (
                "data:image/svg+xml;utf8,"
                f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='48' height='48'>"
                f"<rect width='24' height='24' rx='12' fill='{quote_plus(style['accent'])}'/>"
                "<path d='M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' fill='%23FFFFFF'/>"
                "</svg>"
            )
            dept_node = {
                "id": dept_node_id,
                "data": {
                    "imageURL": dept_svg,
                    "name": dept,
                    "title": f"{len(dept_emps)} Employee(s)",
                    "subtitle": f"{branch['branch']} Department",
                    "badge": {"text": f"{len(dept_emps)} Staff", "color": style["badge"]},
                    "accentColor": style["accent"],
                    "node_type": "department",
                    "details": {"department": dept, "count": len(dept_emps), "branch": branch["branch"]},
                },
                "children": [format_emp_node(e) for e in dept_emps],
            }
            branch_node["children"].append(dept_node)

    elif view_mode == "flat":
        branch_node["children"] = [format_emp_node(e) for e in employees]

    else:
        # Reporting hierarchy
        emp_map = {e["name"]: e for e in employees}
        node_map = {e["name"]: format_emp_node(e) for e in employees}
        children_of = {e["name"]: [] for e in employees}
        top_level_ids = []

        for e in employees:
            mgr = e.get("reports_to")
            if mgr and mgr in emp_map and mgr != e["name"]:
                children_of[mgr].append(e["name"])
            else:
                top_level_ids.append(e["name"])

        visited = set()

        def attach_children(parent_id, current_node):
            visited.add(parent_id)
            for child_id in children_of.get(parent_id, []):
                if child_id not in visited:
                    child_node = node_map[child_id]
                    attach_children(child_id, child_node)
                    current_node["children"].append(child_node)

        for top_id in top_level_ids:
            top_node = node_map[top_id]
            attach_children(top_id, top_node)
            branch_node["children"].append(top_node)

        for emp in employees:
            if emp["name"] not in visited:
                orphan_node = node_map[emp["name"]]
                attach_children(emp["name"], orphan_node)
                branch_node["children"].append(orphan_node)

    return {
        "branch": branch,
        "tree": branch_node,
        "summary": summary,
    }
