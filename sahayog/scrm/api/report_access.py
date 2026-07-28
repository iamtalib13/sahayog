import frappe
from frappe.utils import now_datetime, getdate, date_diff, format_date

def norm(val):
    if not val: return ""
    return str(val).lower().replace(" ", "").replace("_", "-").strip()
REGION_ALIAS_MAP = {
    "ho": {"ho", "headoffice", "head-office"},
    "headoffice": {"ho", "headoffice", "head-office"},
}

def validate_report_access():
    user = frappe.session.user

    if user == "Administrator":
        return True

    exists = frappe.db.exists("Report Preference", {"user": user})

    return bool(exists)
    
@frappe.whitelist()
def get_all_system_regions():
    # Sahayog Branch doctype se saare unique regions fetch karna
    regions = frappe.get_all("Sahayog Branch", fields=["distinct region"], order_by="region asc")
    return [r.region for r in regions if r.region]

@frappe.whitelist()
def get_user_report_preference_record(user):
    frappe.log_error(f"CRM Preference Fetch", f"User: {user}")
    result = []
    if user == "Administrator":
        names = frappe.get_all("Report Preference", pluck="name")
    else:
        names = frappe.get_all("Report Preference", filters={"user": user}, pluck="name")
    
    if not names: return None

    for name in names:
        doc = frappe.get_doc("Report Preference", name)
        
        # Pre-fetch SOL ID labels
        sol_ids = [str(d.sol_id) for d in doc.sol_id if d.sol_id]
        branches = frappe.get_all("Sahayog Branch", filters={"sol_id": ["in", sol_ids]}, fields=["sol_id", "branch"])
        branch_map = {str(b.sol_id): b.branch for b in branches}
        
        # Pre-fetch Product labels
        product_codes = [d.product for d in doc.product]
        products = frappe.get_all("Product", filters={"name": ["in", product_codes]}, fields=["name", "product_name"])
        product_map = {p.name: p.product_name for p in products}

        result.append({
            "user": doc.user,
            "product": [{"value": p, "label": f"{p} - {product_map.get(p, 'Unknown')}"} for p in product_codes],
            "source": [d.source for d in doc.source],
            "zone": [d.zone for d in doc.zone],
            "region": [d.region for d in doc.region],
            "sol_id": [{"value": s, "label": f"{s} - {branch_map.get(s, 'Unknown')}"} for s in sol_ids],
        })
    return result

def get_branch_map(sol_ids):
    if not sol_ids: return {}
    sol_ids_key = ",".join(sorted(map(str, sol_ids)))
    cache_key = f"crm_branch_map:{sol_ids_key}"
    cached = frappe.cache().get_value(cache_key)
    if cached is not None:
        return cached
    branches = frappe.get_all("Sahayog Branch", filters={"sol_id": ["in", sol_ids]}, fields=["sol_id", "branch", "region", "district", "zone"])
    res = {str(b.sol_id): b for b in branches}
    frappe.cache().set_value(cache_key, res, expires_in_sec=300)
    return res

def get_employee_map(lead_owners):
    if not lead_owners: return {}
    owners_key = ",".join(sorted(map(str, lead_owners)))
    cache_key = f"crm_employee_map:{owners_key}"
    cached = frappe.cache().get_value(cache_key)
    if cached is not None:
        return cached
    employees = frappe.get_all(
        "Employee",
        filters={"user_id": ["in", lead_owners], "status": "Active"},
        fields=["employee_name", "employee_number", "designation", "user_id"]
    )
    res = {e.user_id: e for e in employees}
    frappe.cache().set_value(cache_key, res, expires_in_sec=300)
    return res

def empty_stats():
    return {
        "total": 0,
        "converted": 0,
        "follow_up": 0,
        "not_interested": 0,
    }

@frappe.whitelist()
def get_leads(from_date, to_date, limit=None, offset=0, filters=None):
    user = frappe.session.user
    from_date, to_date = validate_date_range(from_date, to_date)
    
    # Tracking counters for debugging
    skip_reason_sol_pref = 0
    skip_reason_no_branch = 0
    skip_reason_zone_region_mismatch = 0
    skip_reason_source = 0
    skip_reason_product = 0

    frappe.log_error(
            "CRM INPUT DEBUG",
            f"User:{user}, From:{from_date}, To:{to_date}, Filters:{filters}"
        )
    
@frappe.whitelist()
def get_base_filtered_leads(from_date, to_date, user, ui_filters=None):
    """Centralized helper to fetch and filter base leads. Prevents duplicate DB queries."""
    from_date, to_date = validate_date_range(from_date, to_date)
    ui_filters = frappe.parse_json(ui_filters) if ui_filters else {}

    # ---------- Preferences ----------
    has_pref = False
    is_all_regions = False 
    products_pref, sources_pref, zones_pref, regions_pref, sol_ids_pref = set(), set(), set(), set(), set()
    
    if user != "Administrator":
        pref_res = get_user_report_preference_record(user)
        if pref_res:
            has_pref = True
            p = pref_res[0]
            is_all_regions = p.get("all_regions") 
            zones_pref = {norm(x) for x in p.get("zone", [])}
            regions_pref = {norm(x) for x in p.get("region", [])}
            sol_ids_pref = {str(x.get("value")) for x in p.get("sol_id", [])}

    # Standardize UI filters
    if "product" in ui_filters:
        products_pref = {norm(x) for x in ui_filters.get("product", [])}
    if "source" in ui_filters:
        sources_pref = {norm(x) for x in ui_filters.get("source", [])}
    if "zone" in ui_filters:
        ui_zones = {norm(x) for x in ui_filters.get("zone", [])}
        zones_pref = zones_pref.intersection(ui_zones) if ui_zones else set()
    if "region" in ui_filters:
        ui_regions = {norm(x) for x in ui_filters.get("region", [])}
        regions_pref = regions_pref.intersection(ui_regions) if ui_regions else set()
    if "sol_id" in ui_filters:
        ui_sols = {str(x) for x in ui_filters.get("sol_id", [])}
        sol_ids_pref = sol_ids_pref.intersection(ui_sols) if ui_sols else set()

    # ---------- Fetch Leads ----------
    lead_db_filters = [
        ["creation", ">=", f"{from_date} 00:00:00"],
        ["creation", "<=", f"{to_date} 23:59:59"]
    ]
    if sol_ids_pref:
        lead_db_filters.append(["sol_id", "in", list(sol_ids_pref)])
    elif user != "Administrator" and not has_pref:
        lead_db_filters.append(["lead_owner", "=", user])

    page_length = 20000
    start = 0
    leads = []

    while True:
        batch = frappe.get_all(
            "Lead",
            filters=lead_db_filters,
            fields=["name", "status", "lead_name", "mobile_no", "phone", "source", "lead_owner", "sol_id", "creation"],
            order_by="creation desc",
            start=start,
            limit_page_length=page_length
        )
        if not batch: break
        leads.extend(batch)
        start += page_length

    if not leads:
        return [], {}, {}, {}

    # Pre-fetch lookup details
    lead_names = [l.name for l in leads]
    product_rows = frappe.get_all("Lead Product", filters={"parent": ["in", lead_names]}, fields=["parent", "product", "product_name", "product_amount"])
    product_map = {}
    for pr in product_rows:
        product_map.setdefault(pr.parent, []).append(pr)

    sol_ids = {str(l.sol_id) for l in leads if l.sol_id}
    branch_map = get_branch_map(list(sol_ids))
    employee_map = get_employee_map(list({l.lead_owner for l in leads if l.lead_owner}))

    final_leads = []

    for l in leads:
        if user != "Administrator" and not has_pref:
            if l.lead_owner != user:
                continue

        curr_sol = str(l.sol_id) if l.sol_id else ""
        if sol_ids_pref and curr_sol not in sol_ids_pref:
            continue

        branch = branch_map.get(curr_sol) if curr_sol else None
        
        if branch:
            lead_zone = norm(branch.zone)
            lead_region = norm(branch.region)
            zone_match = not zones_pref or (lead_zone in zones_pref)
            
            region_match = True
            if is_all_regions: 
                region_match = True
            elif regions_pref:
                allowed = set(regions_pref)
                for r in list(regions_pref):
                    allowed |= REGION_ALIAS_MAP.get(r, set())
                region_match = lead_region in allowed

            if not zone_match or not region_match:
                continue
        else:
            if zones_pref or regions_pref:
                continue

        if sources_pref and norm(l.source) not in sources_pref:
            continue

        l_products = product_map.get(l.name, [])
        matched_products = []
        
        if products_pref:
            matched_products = [p for p in l_products if norm(p.product) in products_pref]
            if not matched_products:
                continue 
        else:
            matched_products = l_products if l_products else [{}]

        emp = employee_map.get(l.lead_owner)

        for p in matched_products:
            new_row = l.copy()
            new_row.update({
                "product_code": p.get("product") or "-",
                "product_name": p.get("product_name") or "-",
                "amount": p.get("product_amount") or 0,
                "employee_name": emp.employee_name if emp else "-",
                "employee_id": emp.employee_number if emp else "-",
                "designation": emp.designation if emp else "-",
                "branch_info": branch or {"branch": "No SOL", "district": "-", "region": "-", "zone": "-"},
                "contact": l.mobile_no or l.phone or "-"
            })
            final_leads.append(new_row)

    return final_leads, branch_map, employee_map, product_map


@frappe.whitelist()
def get_leads(from_date, to_date, limit=None, offset=0, filters=None):
    user = frappe.session.user
    final_leads, _, _, _ = get_base_filtered_leads(from_date, to_date, user, filters)
    return {
        "leads": final_leads,
        "stats": {
            "total": len(final_leads),
            "converted": sum(1 for x in final_leads if x['status'] == "Converted"),
            "follow_up": sum(1 for x in final_leads if x['status'] == "Follow Up"),
            "not_interested": sum(1 for x in final_leads if x['status'] == "Not Interested"),
        }
    }


def validate_date_range(from_date, to_date):
    if not from_date or not to_date: frappe.throw("Dates are required")
    f, t = getdate(from_date), getdate(to_date)
    if f > t: frappe.throw("From Date cannot be after To Date")
    return f, t


# sahayog/scrm/api/report_access.py (Ke andar changes)

@frappe.whitelist()
def queue_leads_export(from_date, to_date, filters=None, format="csv"):
    user = frappe.session.user

    frappe.cache().set_value(
        f"export_status_{user}",
        {"status": "processing"},
        expires_in_sec=600
    )

    frappe.enqueue(
        method="sahayog.scrm.api.report_access.run_leads_export_job",
        queue="long",
        timeout=3600,
        user=user,
        from_date=from_date,
        to_date=to_date,
        filters=filters,
        format=format
    )
    return {"status": "queued"}


import io
import csv
import zipfile


def run_leads_export_job(user, from_date, to_date, filters=None, format="csv"):
    frappe.set_user(user)

    try:
        data = get_leads(from_date, to_date, filters=filters)
        leads = data.get("leads", [])

        headers = [
            "Sr.No.", "Status", "Lead ID", "Customer", "Contact",
            "Source", "Product Code", "Product Name", "Amount",
            "Employee Name", "Employee ID", "Designation",
            "SOL ID", "Branch", "District", "Region", "Zone", "Created On"
        ]

        # ---------- CREATE CSV IN MEMORY (FAST) ----------
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_ALL)

        writer.writerow(headers)

        for i, l in enumerate(leads):
            b = l.get("branch_info", {})
            writer.writerow([
                i + 1,
                l.status,
                l.name,
                l.lead_name or "",
                l.contact,
                l.source or "",
                l.product_code,
                l.product_name,
                l.amount,
                l.employee_name,
                l.employee_id,
                l.designation,
                l.sol_id or "-",
                b.get("branch", "-"),
                b.get("district", "-"),
                b.get("region", "-"),
                b.get("zone", "-"),
                format_date(l.creation, "dd-mm-yyyy")
            ])

        csv_content = output.getvalue()
        output.close()

        # ---------- HANDLE FORMAT ----------
        if format == "zip":
            zip_buffer = io.BytesIO()

            with zipfile.ZipFile(
                zip_buffer,
                "w",
                compression=zipfile.ZIP_DEFLATED,
                compresslevel=6  # balanced speed + compression
            ) as zip_file:
                zip_file.writestr(
                    f"crm_leads_{from_date}_to_{to_date}.csv",
                    csv_content
                )

            file_content = zip_buffer.getvalue()
            filename = f"crm_leads_{from_date}_to_{to_date}.zip"

        else:
            file_content = csv_content
            filename = f"crm_leads_{from_date}_to_{to_date}.csv"
        
        # ---------- SAVE FILE ----------
        file_doc = frappe.get_doc({
            "doctype": "File",
            "file_name": filename,
            "content": file_content,
            "is_private": 1
        }).insert(ignore_permissions=True)

        status_data = {
            "status": "completed",
            "file_url": file_doc.file_url,
            "row_count": len(leads),
            "from_date": from_date,
            "to_date": to_date
        }

        frappe.cache().set_value(
            f"export_status_{user}",
            status_data,
            expires_in_sec=600
        )

        notify_user(
            user,
            f"Export Ready: {filename}. "
            f"<a href='{file_doc.file_url}' target='_blank'>Download</a>"
        )

        frappe.db.commit()

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(f"CRM Export Job Failed: {str(e)}", frappe.get_traceback())
        frappe.cache().set_value(
            f"export_status_{user}",
            {"status": "failed", "error": str(e)},
            expires_in_sec=600
        )
    
@frappe.whitelist()
def check_export_status():
    return frappe.cache().get_value(f"export_status_{frappe.session.user}") or {"status": "pending"}

def notify_user(user, message):
    try:
        notification_doc = frappe.new_doc("Notification Log")
        notification_doc.update({
            "for_user": user,
            "subject": "Lead Export Ready",
            "type": "Alert",
            "document_type": "Lead",
        })
        notification_doc.insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        frappe.log_error("Notify User Error", frappe.get_traceback())


@frappe.whitelist()
def get_employee_performance_data(from_date, to_date, sol_ids=None):
    try:
        user = frappe.session.user
        active_sol_ids = frappe.parse_json(sol_ids) if sol_ids else None

        # Redis cache check (120s TTL)
        sol_ids_key = ",".join(sorted(active_sol_ids)) if active_sol_ids else ""
        _cache_key = f"emp_perf:{user}:{from_date}:{to_date}:{sol_ids_key}"
        _cached = frappe.cache().get_value(_cache_key)
        if _cached is not None:
            return _cached

        ui_filters = {"sol_id": active_sol_ids} if active_sol_ids else {}
        final_leads, _, _, _ = get_base_filtered_leads(from_date, to_date, user, ui_filters)

        employee_stats = {}

        for row in final_leads:
            emp_id = row.get("employee_id")
            if not emp_id or emp_id == "-":
                continue

            if emp_id not in employee_stats:
                b = row.get("branch_info", {})
                employee_stats[emp_id] = {
                    "employee_id": emp_id,
                    "employee_name": row.get("employee_name"),
                    "designation": row.get("designation") or "-",
                    "sol_id": row.get("sol_id"),
                    "branch": b.get("branch", "-") if isinstance(b, dict) else "-",
                    "region": b.get("region", "-") if isinstance(b, dict) else "-",
                    "zone": b.get("zone", "-") if isinstance(b, dict) else "-",
                    "total_leads": 0,
                    "total_leads_amount": 0,
                    "total_converted": 0,
                    "converted_amount": 0,
                    "total_followups": 0,
                    "followup_amount": 0,
                    "total_not_interested": 0,
                    "not_interested_amount": 0,
                }

            stat = employee_stats[emp_id]
            lead_amt = row.get("amount") or 0
            stat["total_leads"] += 1
            stat["total_leads_amount"] += lead_amt

            status = row.get("status")
            if status == "Converted":
                stat["total_converted"] += 1
                stat["converted_amount"] += lead_amt
            elif status == "Follow Up":
                stat["total_followups"] += 1
                stat["followup_amount"] += lead_amt
            elif status == "Not Interested":
                stat["total_not_interested"] += 1
                stat["not_interested_amount"] += lead_amt

        result = list(employee_stats.values())
        frappe.cache().set_value(_cache_key, result, expires_in_sec=120)
        return result

    except Exception:
        frappe.log_error(
            title=f"EMP PERF CRASH - {frappe.session.user}",
            message=frappe.get_traceback()
        )
        raise


@frappe.whitelist()
def get_all_products_sources():
    cache_key = "crm_all_products_sources"
    cached = frappe.cache().get_value(cache_key)
    if cached is not None:
        return cached
    products = frappe.get_all(
        "Product",
        fields=["name", "product_name", "exclude"],
        order_by="name asc"
    )
    sources = frappe.get_all(
        "Lead Source",
        fields=["name"],
        filters={
            "custom_active": 1
        },
        order_by="name asc"
    )
    res = {
        "products": [
            {
                "label": f"{p.name} - {p.product_name or ''}",
                "value": p.name,
                "exclude": p.exclude
            }
            for p in products
        ],
        "sources": [s.name for s in sources]
    }
    frappe.cache().set_value(cache_key, res, expires_in_sec=600)
    return res


@frappe.whitelist()
def get_crm_top_analytics(from_date, to_date):
    user = frappe.session.user
    final_leads, _, _, _ = get_base_filtered_leads(from_date, to_date, user)

    if not final_leads:
        return {
            "top_branches": [],
            "top_employees": [],
            "lowest_usage_branches": []
        }

    branch_stats = {}
    employee_stats = {}

    for row in final_leads:
        b = row.get("branch_info", {})
        branch_key = b.get("branch") if isinstance(b, dict) else None
        
        if branch_key and branch_key != "No SOL":
            if branch_key not in branch_stats:
                branch_stats[branch_key] = {
                    "branch": branch_key,
                    "zone": b.get("zone"),
                    "region": b.get("region"),
                    "total_leads": 0,
                    "converted": 0,
                    "followups": 0
                }
            branch_stats[branch_key]["total_leads"] += 1
            if row.get("status") == "Converted":
                branch_stats[branch_key]["converted"] += 1
            if row.get("status") == "Follow Up":
                branch_stats[branch_key]["followups"] += 1

        emp_id = row.get("employee_id")
        if emp_id and emp_id != "-":
            if emp_id not in employee_stats:
                employee_stats[emp_id] = {
                    "employee_id": emp_id,
                    "employee_name": row.get("employee_name"),
                    "designation": row.get("designation") or "-",
                    "total_leads": 0,
                    "converted": 0
                }
            employee_stats[emp_id]["total_leads"] += 1
            if row.get("status") == "Converted":
                employee_stats[emp_id]["converted"] += 1

    for b in branch_stats.values():
        b["conversion_rate"] = round(
            (b["converted"] / b["total_leads"]) * 100, 2
        ) if b["total_leads"] else 0

        b["usage_percent"] = round(
            (b["followups"] / b["total_leads"]) * 100, 2
        ) if b["total_leads"] else 0

    for e in employee_stats.values():
        e["conversion_rate"] = round(
            (e["converted"] / e["total_leads"]) * 100, 2
        ) if e["total_leads"] else 0

    top_branches = sorted(
        branch_stats.values(),
        key=lambda x: x["total_leads"],
        reverse=True
    )[:5]

    top_employees = sorted(
        employee_stats.values(),
        key=lambda x: x["total_leads"],
        reverse=True
    )[:10]

    lowest_usage_branches = sorted(
        branch_stats.values(),
        key=lambda x: x["usage_percent"]
    )[:5]

    return {
        "top_branches": top_branches,
        "top_employees": top_employees,
        "lowest_usage_branches": lowest_usage_branches
    }
import frappe

@frappe.whitelist()
def transfer_employee_leads(target_employee, source_employee):

    try:

        user_roles = frappe.get_roles(frappe.session.user)

        if "Branch Manager" not in user_roles:
            frappe.throw("Only Branch Manager can transfer leads")

        target_user = frappe.db.get_value("Employee", target_employee, "user_id")
        source_user = frappe.db.get_value("Employee", source_employee, "user_id")

        if not target_user:
            frappe.throw(f"Employee {target_employee} does not have a User ID")

        if not source_user:
            frappe.throw(f"Employee {source_employee} does not have a User ID")

        count = frappe.db.count("Lead", {"lead_owner": target_user})

        if count == 0:
            return {"status": "no_leads"}

        frappe.db.sql("""
            UPDATE `tabLead`
            SET lead_owner = %s, owner = %s
            WHERE lead_owner = %s
        """, (source_user, source_user, target_user))

        frappe.db.commit()

        return {
            "status": "success",
            "count": count
        }

    except Exception:

        frappe.log_error(
            title="Lead Transfer Error",
            message=frappe.get_traceback()
        )

        frappe.throw("Error occurred while transferring leads")
@frappe.whitelist()
def get_employee_lead_count(employee):

    user = frappe.db.get_value("Employee", employee, "user_id")
    emp_name = frappe.db.get_value("Employee", employee, "employee_name")

    if not user:
        return {
            "count": 0,
            "employee_name": emp_name
        }

    count = frappe.db.count("Lead", {"lead_owner": user})

    return {
        "count": count,
        "employee_name": emp_name
    }

@frappe.whitelist()
def get_branches_by_filters(zones=None, regions=None, sol_ids=None):
    user = frappe.session.user
    
    # Parse inputs
    zones_list = frappe.parse_json(zones) if zones else []
    regions_list = frappe.parse_json(regions) if regions else []
    sol_ids_list = frappe.parse_json(sol_ids) if sol_ids else []
    
    # Standardize types to lists
    if isinstance(zones_list, str): zones_list = [zones_list]
    if isinstance(regions_list, str): regions_list = [regions_list]
    if isinstance(sol_ids_list, str): sol_ids_list = [sol_ids_list]
    
    filters = []
    if zones_list:
        filters.append(["zone", "in", zones_list])
    if regions_list:
        filters.append(["region", "in", regions_list])
        
    branches = []
    if filters:
        branches = frappe.get_all(
            "Sahayog Branch",
            filters=filters,
            fields=["sol_id", "branch", "region", "zone"],
            order_by="sol_id asc"
        )
        
    # If there are specific sol_ids assigned/selected, we merge them
    if sol_ids_list:
        specific_branches = frappe.get_all(
            "Sahayog Branch",
            filters={"sol_id": ["in", sol_ids_list]},
            fields=["sol_id", "branch", "region", "zone"],
            order_by="sol_id asc"
        )
        existing_sols = {b.sol_id for b in branches}
        for sb in specific_branches:
            if sb.sol_id not in existing_sols:
                branches.append(sb)
                
    # Fallback: If no branches matched yet (e.g. no zone/region/sol_id selected, or user has no preference)
    if not branches and user != "Administrator":
        # Get employee's sol_id
        emp_sol = frappe.db.get_value("Employee", {"user_id": user}, "sol_id")
        if emp_sol:
            branches = frappe.get_all(
                "Sahayog Branch",
                filters={"sol_id": emp_sol},
                fields=["sol_id", "branch", "region", "zone"]
            )
            
    return branches