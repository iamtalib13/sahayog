import frappe
from frappe.utils import format_datetime
from sahayog.permissions import get_user_sol_ids

def execute(filters=None):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    filters = filters or {}
    lead_filters = {}

    unrestricted_roles = {"Administrator", "System Manager", "Admin", "Sales Manager"}
    is_unrestricted = any(role in roles for role in unrestricted_roles)

    # 🔐 1. Fetch allowed SOL IDs from 'Report Preference' Doctype
    report_pref_sol_ids = get_user_sol_ids(user)

    # 🔐 2. Fetch User Permissions for 'Sahayog Branch' and 'Branch' from Frappe Permission Manager
    user_permissions = frappe.permissions.get_user_permissions(user)
    permitted_sahayog_branches = [
        d.get("doc") for d in user_permissions.get("Sahayog Branch", []) if d.get("doc")
    ]
    permitted_branches = [
        d.get("doc") for d in user_permissions.get("Branch", []) if d.get("doc")
    ]

    sb_filters = {}

    if report_pref_sol_ids:
        sb_filters["sol_id"] = ["in", report_pref_sol_ids]
    elif permitted_sahayog_branches:
        sb_filters["name"] = ["in", permitted_sahayog_branches]
    elif permitted_branches:
        sb_filters["branch"] = ["in", permitted_branches]

    # 🔐 3. Apply role-based employee restriction if user is not unrestricted and no Report Preference set
    if not is_unrestricted and not report_pref_sol_ids:
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "branch", "custom_zone", "custom_region"],
            as_dict=True
        )

        if not employee and not (permitted_sahayog_branches or permitted_branches):
            frappe.throw(f"Employee record not found for user: {user}")

        if employee:
            if "Branch Manager" in roles and employee.branch:
                if frappe.db.exists("Sahayog Branch", employee.branch):
                    sb_filters["name"] = employee.branch
                else:
                    sb_filters["branch"] = employee.branch

            elif "Regional Manager" in roles and employee.custom_region and employee.custom_zone:
                sb_filters["region"] = employee.custom_region
                sb_filters["zone"] = employee.custom_zone

            elif "Zonal Manager" in roles and employee.custom_zone:
                sb_filters["zone"] = employee.custom_zone

    # 🏢 4. Fetch branches from Sahayog Branch (frappe.get_list applies Permission Manager rules)
    sahayog_branches = frappe.get_list(
        "Sahayog Branch",
        filters=sb_filters,
        fields=["name", "sol_id", "branch", "zone", "region"],
        ignore_permissions=False,
        order_by="sol_id asc",
        limit_page_length=0
    )

    allowed_sol_ids = list(set([str(b.sol_id or b.name).strip() for b in sahayog_branches if b.get("sol_id") or b.get("name")]))
    allowed_branch_names = list(set([str(b.branch).strip() for b in sahayog_branches if b.get("branch")]))
    all_allowed_identifiers = list(set(allowed_sol_ids + allowed_branch_names))

    # 📅 Filter leads created OR modified TODAY
    today = frappe.utils.today()
    today_start = f"{today} 00:00:00"
    today_end = f"{today} 23:59:59"

    or_filters = [
        ["creation", "between", [today_start, today_end]],
        ["modified", "between", [today_start, today_end]]
    ]

    # 🔍 Base lead filters from UI (Employee filters)
    base_lead_filters = {}

    if filters.get("custom_employee_id"):
        base_lead_filters["custom_employee_id"] = filters.get("custom_employee_id")

    if filters.get("custom_employee_name"):
        base_lead_filters["custom_employee_name"] = ["like", f"%{filters.get('custom_employee_name')}%"]

    # 📦 Fetch ALL permitted today's leads from Lead table
    all_today_leads = frappe.db.get_all(
        "Lead",
        filters=base_lead_filters,
        or_filters=or_filters,
        fields=[
            "name", "lead_name", "status", "source", "custom_branch", 
            "custom_zone", "custom_region", "creation", "lead_owner",
            "phone", "email_id", "custom_employee_id", "custom_employee_name",
            "custom_designation", "custom_district", "sol_id"
        ]
    )

    # 🔒 Strict permission filter: keep ONLY leads belonging to user's permitted branches
    is_restricted_user = not is_unrestricted or bool(report_pref_sol_ids or permitted_sahayog_branches or permitted_branches or (not is_unrestricted and sahayog_branches))

    if is_restricted_user and sahayog_branches:
        permitted_leads = []
        for lead in all_today_leads:
            lead_sol = str(lead.get("sol_id") or "").strip()
            lead_br = str(lead.get("custom_branch") or "").strip()
            if lead_sol in allowed_sol_ids or lead_br in all_allowed_identifiers:
                permitted_leads.append(lead)
        all_today_leads = permitted_leads

    # 📊 Calculate Today's Leads count per Sahayog Branch BEFORE capsule filtering
    branch_counts = {}
    total_leads_count = len(all_today_leads)

    for lead in all_today_leads:
        sol = str(lead.get("sol_id") or "").strip()
        br = str(lead.get("custom_branch") or "").strip()
        
        if sol:
            branch_counts[sol] = branch_counts.get(sol, 0) + 1
        if br and br != sol:
            branch_counts[br] = branch_counts.get(br, 0) + 1

    # 🏷️ Build HTML Capsule Cards for Sahayog Branches
    selected_branch = str(filters.get("selected_branch") or filters.get("custom_branch") or filters.get("sol_id") or "").strip()

    capsules_html = []
    
    # 'ALL' Capsule Card only shown for unrestricted/admin users
    if not is_restricted_user:
        all_active_cls = "active" if not selected_branch else ""
        capsules_html.append(f'''
            <div class="lead-branch-capsule {all_active_cls}" data-sol="" data-branch="" title="Show All Permitted Branches">
                <span class="sol-tag">ALL</span>
                <span class="count-pill">{total_leads_count}</span>
            </div>
        ''')

    for b in sahayog_branches:
        sol = str(b.get("sol_id") or b.get("name") or "").strip()
        br_name = str(b.get("branch") or "").strip()

        count = branch_counts.get(sol, 0)
        if not count and br_name:
            count = branch_counts.get(br_name, 0)

        display_label = f"Branch: {br_name} (SOL ID: {sol})" if (sol and br_name and sol != br_name) else (br_name or sol)

        is_active = "active" if (selected_branch and selected_branch in (sol, br_name)) else ""

        capsules_html.append(f'''
            <div class="lead-branch-capsule {is_active}" data-sol="{sol}" data-branch="{br_name}" title="{display_label}">
                <span class="sol-tag">{sol or 'N/A'}</span>
                <span class="count-pill">{count}</span>
            </div>
        ''')

    html_message = f'''
        <div class="lead-branch-capsules-wrapper">
            <div class="capsules-header">
                <span class="capsules-title">🏢 Today's Branch Leads</span>
            </div>
            <div class="capsules-list">
                {"".join(capsules_html)}
            </div>
        </div>
    '''

    # 🎯 Filter leads for the report table if a branch capsule card is selected
    leads = []
    if selected_branch:
        for lead in all_today_leads:
            lead_sol = str(lead.get("sol_id") or "").strip()
            lead_br = str(lead.get("custom_branch") or "").strip()
            
            if selected_branch == lead_sol or selected_branch == lead_br:
                leads.append(lead)
            else:
                matching_branch = [b for b in sahayog_branches if str(b.get("sol_id") or b.get("name")).strip() == selected_branch or str(b.get("branch")).strip() == selected_branch]
                if matching_branch:
                    target_sols = [str(mb.get("sol_id") or mb.get("name")).strip() for mb in matching_branch]
                    target_names = [str(mb.get("branch")).strip() for mb in matching_branch]
                    if lead_sol in target_sols or lead_br in target_names or lead_br in target_sols:
                        leads.append(lead)
    else:
        leads = all_today_leads

    # 📦 Bulk fetch child table products in a single query to eliminate N+1 overhead
    lead_names = [lead.name for lead in leads]
    products_map = {}

    if lead_names:
        try:
            all_products = frappe.db.get_all(
                "Lead Product",
                filters={"parent": ["in", lead_names]},
                fields=["parent", "product", "product_name", "product_amount"]
            )
            for prod in all_products:
                products_map.setdefault(prod.parent, []).append(prod)
        except Exception:
            products_map = {}

    # 📊 Process leads with product expansion
    report_data = []
    row_idx = 1
    
    for lead in leads:
        emp_name = lead.get("custom_employee_name") or lead.get("lead_owner") or "Unknown"
        emp_id = lead.get("custom_employee_id") or "-"
        designation = lead.get("custom_designation") or "-"
        emp_branch = lead.get("custom_branch") or "-"
        emp_district = lead.get("custom_district") or "-"
        sol_id = lead.get("sol_id") or "-"
        
        # Format contact info from standard fields
        contact = lead.phone or lead.email_id or "-"
    
        products = products_map.get(lead.name, [])
        
        if products:
            for product in products:
                product_code = product.get("product") or "-"
                product_name = product.get("product_name") or "-"
                amount = float(product.get("product_amount") or 0)
                
                report_data.append({
                    "row_idx": row_idx,
                    "status": lead.status,
                    "lead_name": lead.name,
                    "customer": lead.lead_name or "-",
                    "contact": contact,
                    "source": lead.source or "-",
                    "product_code": product_code,
                    "product_name": product_name,
                    "amount": frappe.utils.fmt_money(amount, currency=None),
                    "employee_name": emp_name,
                    "employee_id": emp_id,
                    "designation": designation,
                    "sol_id": sol_id,
                    "branch": emp_branch,
                    "district": emp_district,
                    "region": lead.custom_region or "-",
                    "zone": lead.custom_zone or "-",
                    "creation": format_datetime(lead.creation, "MMM dd, yyyy hh:mm a")
                })
                row_idx += 1
        else:
            report_data.append({
                "row_idx": row_idx,
                "status": lead.status,
                "lead_name": lead.name,
                "customer": lead.lead_name or "-",
                "contact": contact,
                "source": lead.source or "-",
                "product_code": "-",
                "product_name": "-",
                "amount": "-",
                "employee_name": emp_name,
                "employee_id": emp_id,
                "designation": designation,
                "sol_id": sol_id,
                "branch": emp_branch,
                "district": emp_district,
                "region": lead.custom_region or "-",
                "zone": lead.custom_zone or "-",
                "creation": format_datetime(lead.creation, "MMM dd, yyyy hh:mm a")
            })
            row_idx += 1

    # 📊 Complete column definition matching UI
    columns = [
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 100},
        {"label": "Lead ID", "fieldname": "lead_name", "fieldtype": "Link", "options": "Lead", "width": 120},
        {"label": "Customer", "fieldname": "customer", "fieldtype": "Data", "width": 150},
        {"label": "Contact", "fieldname": "contact", "fieldtype": "Data", "width": 110},
        {"label": "Source", "fieldname": "source", "fieldtype": "Data", "width": 100},
        {"label": "Product Code", "fieldname": "product_code", "fieldtype": "Data", "width": 120},
        {"label": "Product Name", "fieldname": "product_name", "fieldtype": "Data", "width": 200},
        {"label": "Amount", "fieldname": "amount", "fieldtype": "Currency", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 150},
        {"label": "Employee ID", "fieldname": "employee_id", "fieldtype": "Data", "width": 100},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 120},
        {"label": "SOL ID", "fieldname": "sol_id", "fieldtype": "Data", "width": 100},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Link", "options": "Branch", "width": 120},
        {"label": "District", "fieldname": "district", "fieldtype": "Data", "width": 100},
        {"label": "Region", "fieldname": "region", "fieldtype": "Link", "options": "Region", "width": 100},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Link", "options": "Zone", "width": 100},
        {"label": "Created On", "fieldname": "creation", "fieldtype": "Data", "width": 160},
    ]

    return columns, report_data, html_message, None, None




