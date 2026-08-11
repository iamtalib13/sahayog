import os
import csv
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
    frappe.cache().set_value(cache_key, res, expires_in_sec=86400)
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
    frappe.cache().set_value(cache_key, res, expires_in_sec=86400)
    return res

def empty_stats():
    return {
        "total": 0,
        "converted": 0,
        "follow_up": 0,
        "not_interested": 0,
    }

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

    # ---------- Build Query Conditions ----------
    conditions = [
        "l.creation >= %(from_date)s",
        "l.creation <= %(to_date)s"
    ]
    values = {
        "from_date": f"{from_date} 00:00:00",
        "to_date": f"{to_date} 23:59:59"
    }

    if sol_ids_pref:
        conditions.append("l.sol_id IN %(sol_ids_pref)s")
        values["sol_ids_pref"] = tuple(sol_ids_pref)
    elif user != "Administrator" and not has_pref:
        conditions.append("l.lead_owner = %(lead_owner)s")
        values["lead_owner"] = user

    if products_pref:
        conditions.append("lp.product IN %(products_pref)s")
        values["products_pref"] = tuple(products_pref)
    if sources_pref:
        conditions.append("l.source IN %(sources_pref)s")
        values["sources_pref"] = tuple(sources_pref)
    if zones_pref:
        conditions.append("b.zone IN %(zones_pref)s")
        values["zones_pref"] = tuple(zones_pref)
    if regions_pref:
        allowed_regions = set(regions_pref)
        for r in list(regions_pref):
            allowed_regions |= REGION_ALIAS_MAP.get(r, set())
        conditions.append("b.region IN %(regions_pref)s")
        values["regions_pref"] = tuple(allowed_regions)

    # ---------- Single Optimized SQL Query ----------
    query = """
        SELECT
            l.name,
            l.status,
            l.lead_name,
            COALESCE(l.mobile_no, l.phone, '-') as contact,
            l.source,
            l.lead_owner,
            l.sol_id,
            l.creation,
            COALESCE(lp.product, '-') as product_code,
            COALESCE(lp.product_name, '-') as product_name,
            COALESCE(lp.product_amount, 0) as amount,
            COALESCE(emp.employee_name, '-') as employee_name,
            COALESCE(emp.employee_number, '-') as employee_id,
            COALESCE(emp.designation, '-') as designation,
            b.branch,
            b.district,
            b.region,
            b.zone
        FROM `tabLead` l
        LEFT JOIN `tabLead Product` lp ON lp.parent = l.name
        LEFT JOIN `tabEmployee` emp ON emp.user_id = l.lead_owner AND emp.status = 'Active'
        LEFT JOIN `tabSahayog Branch` b ON b.sol_id = l.sol_id
        WHERE {where_clause}
        ORDER BY l.creation DESC
    """.format(
        where_clause=" AND ".join(conditions)
    )

    frappe.db.sql("SET SESSION sql_select_limit = DEFAULT;")
    raw_leads = frappe.db.sql(query, values, as_dict=True)

    final_leads = []
    for r in raw_leads:
        new_row = frappe._dict(r)
        # Reconstruct branch_info dictionary for compatibility with frontend/KPI loops
        new_row["branch_info"] = {
            "branch": r.get("branch") or "No SOL",
            "district": r.get("district") or "-",
            "region": r.get("region") or "-",
            "zone": r.get("zone") or "-"
        }
        final_leads.append(new_row)

    return final_leads, {}, {}, {}

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
    frappe.cache().set_value(cache_key, res, expires_in_sec=86400)
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

# ==============================================================================
# METHOD: generate_fast_lead_report()
# PURPOSE: Executed by Cron Job or Admin manually. Runs MariaDB INTO OUTFILE
#          query to dump all database lead records into /tmp/ first, then moves
#          it to lead_report.csv in private/files. Bypasses Python RAM and timeouts.
# ==============================================================================
@frappe.whitelist()
def generate_fast_lead_report():
    import shutil
    import datetime
    import csv

    site_private_path = os.path.abspath(frappe.get_site_path("private", "files"))
    final_filepath = os.path.join(site_private_path, "lead_report.csv")
    
    # Calculate rolling 3-day window for gap-free incremental sync
    today = datetime.date.today()
    start_date = today - datetime.timedelta(days=3)
    start_datetime = f"{start_date} 00:00:00"

    file_exists = os.path.exists(final_filepath)

    # 1. Decide date query criteria
    if not file_exists:
        # Full initial dump from 1st July 2026 onwards
        where_clause = "l.creation >= '2026-07-01 00:00:00'"
    else:
        # Incremental Sync: Catch all new creations or modifications from last 3 days
        where_clause = """
            l.creation >= '2026-07-01 00:00:00' AND (
                l.creation >= '{start_datetime}' OR
                l.modified >= '{start_datetime}'
            )
        """.format(start_datetime=start_datetime)

    query = """
        SELECT
            l.name,
            IFNULL(l.status, ''),
            IFNULL(l.lead_name, ''),
            IFNULL(COALESCE(l.mobile_no, l.phone), ''),
            IFNULL(l.source, ''),
            IFNULL(lp.product, ''),
            IFNULL(lp.product_name, ''),
            IFNULL(lp.product_amount, 0),
            IFNULL(e.employee_name, ''),
            IFNULL(e.employee_number, ''),
            IFNULL(e.designation, ''),
            IFNULL(l.sol_id, ''),
            IFNULL(sb.branch, ''),
            IFNULL(sb.district, ''),
            IFNULL(sb.region, ''),
            IFNULL(sb.zone, ''),
            DATE_FORMAT(l.creation, '%d-%m-%Y') as created_on,
            IFNULL(l.lead_owner, '')
        FROM `tabLead` l
        LEFT JOIN `tabLead Product` lp ON lp.parent = l.name
        LEFT JOIN `tabEmployee` e ON e.user_id = l.lead_owner AND e.status = 'Active'
        LEFT JOIN `tabSahayog Branch` sb ON sb.sol_id = l.sol_id
        WHERE {where_clause}
        ORDER BY l.creation DESC
    """.format(where_clause=where_clause)

    frappe.db.sql("SET SESSION sql_select_limit = DEFAULT;")
    db_leads = frappe.db.sql(query, as_list=True)

    headers = [
        "Lead ID", "Status", "Lead Name", "Contact", "Source",
        "Product Code", "Product Name", "Amount",
        "Employee Name", "Employee ID", "Designation",
        "SOL ID", "Branch", "District", "Region", "Zone", "Created On", "Owner Email"
    ]

    new_leads_map = {}
    for row in db_leads:
        lead_id = row[0]
        new_leads_map.setdefault(lead_id, []).append(row)

    # Use unique filename in /tmp to prevent collisions during write
    unique_id = frappe.generate_hash(length=8)
    temp_filepath = f"/tmp/lead_report_{unique_id}.csv"

    if not file_exists:
        # Full initial dump
        with open(temp_filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, quoting=csv.QUOTE_ALL)
            writer.writerow(headers)
            for lead_id, rows in new_leads_map.items():
                for r in rows:
                    writer.writerow(r)
    else:
        # Incremental Sync: Filter old versions of modified leads out of existing CSV
        existing_rows = []
        with open(final_filepath, "r", encoding="utf-8") as f_in:
            reader = csv.reader(f_in)
            try:
                file_headers = next(reader)
            except StopIteration:
                file_headers = headers

            for r in reader:
                if len(r) > 0:
                    lead_id = r[0]
                    # Filter out old version of modified/updated leads
                    if lead_id in new_leads_map:
                        continue
                    existing_rows.append(r)

        # Write merged data
        with open(temp_filepath, "w", newline="", encoding="utf-8") as f_out:
            writer = csv.writer(f_out, quoting=csv.QUOTE_ALL)
            writer.writerow(file_headers)
            for r in existing_rows:
                writer.writerow(r)
            for lead_id, rows in new_leads_map.items():
                for r in rows:
                    writer.writerow(r)

    # Safely replace the file on server filesystem
    shutil.copyfile(temp_filepath, final_filepath)
    try:
        os.remove(temp_filepath)
    except Exception:
        pass

    file_size = os.path.getsize(final_filepath)
    
    latest_sample = {}
    if db_leads:
        first_row = db_leads[0]
        latest_sample = {
            "lead_id": first_row[0],
            "status": first_row[1],
            "lead_name": first_row[2],
            "sol_id": first_row[11],
            "branch": first_row[12],
            "created_on": first_row[16],
        }

    sync_result = {
        "status": "success",
        "method": "Incremental 3-Day Rolling Sync (Creation/Modified)" if file_exists else "Full Baseline Dump",
        "processed_count": len(new_leads_map),
        "size_mb": round(file_size / (1024 * 1024), 2),
        "size_kb": round(file_size / 1024, 2),
        "filepath": final_filepath,
        "latest_sample": latest_sample
    }

    # Trigger email notification to rishabh.rahangdale@sahayogmultistate.com and talib.s@sahayogmultistate.com
    try:
        send_crm_report_sync_email(sync_result)
    except Exception:
        frappe.log_error(title="CRM Report Sync Email Exception", message=frappe.get_traceback())

    return sync_result


def send_crm_report_sync_email(summary_data):
    """Sends HTML email notification to designated emails after CRM Lead Report sync."""
    recipients = [
        "rishabh.rahangdale@sahayogmultistate.com",
        "talib.s@sahayogmultistate.com"
    ]

    now_str = frappe.utils.now_datetime().strftime("%d-%m-%Y %H:%M:%S")
    subject = f"[CRM Report Sync] Fast Lead Report Sync Completed - {now_str}"

    latest_sample = summary_data.get("latest_sample", {})

    message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <div style="background-color: #0056b3; color: white; padding: 18px 24px;">
            <h2 style="margin: 0; font-size: 20px;">📊 CRM Fast Lead Report Sync Notification</h2>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
            <p style="font-size: 15px; color: #333; margin-top: 0;">
                The master lead report CSV file has been successfully generated / updated on the server.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                <tr style="border-bottom: 1px solid #eeeeee;">
                    <td style="padding: 10px 0; font-weight: bold; color: #555; width: 40%;">Task / Cron Name:</td>
                    <td style="padding: 10px 0; color: #111;"><code>generate_fast_lead_report</code></td>
                </tr>
                <tr style="border-bottom: 1px solid #eeeeee;">
                    <td style="padding: 10px 0; font-weight: bold; color: #555;">Execution Time:</td>
                    <td style="padding: 10px 0; color: #111;">{now_str} IST</td>
                </tr>
                <tr style="border-bottom: 1px solid #eeeeee;">
                    <td style="padding: 10px 0; font-weight: bold; color: #555;">Sync Method:</td>
                    <td style="padding: 10px 0; color: #28a745; font-weight: bold;">{summary_data.get("method")}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eeeeee;">
                    <td style="padding: 10px 0; font-weight: bold; color: #555;">Processed Records Count:</td>
                    <td style="padding: 10px 0; color: #111; font-weight: bold;">{summary_data.get("processed_count", 0):,} leads</td>
                </tr>
                <tr style="border-bottom: 1px solid #eeeeee;">
                    <td style="padding: 10px 0; font-weight: bold; color: #555;">Master CSV Size:</td>
                    <td style="padding: 10px 0; color: #111;">{summary_data.get("size_mb", 0)} MB ({summary_data.get("size_kb", 0)} KB)</td>
                </tr>
                <tr style="border-bottom: 1px solid #eeeeee;">
                    <td style="padding: 10px 0; font-weight: bold; color: #555;">File Path:</td>
                    <td style="padding: 10px 0; color: #666; font-size: 12px; word-break: break-all;"><code>{summary_data.get("filepath")}</code></td>
                </tr>
            </table>

            <h3 style="margin-top: 25px; margin-bottom: 10px; font-size: 16px; color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 5px;">
                📌 Latest Synced Lead Sample
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; background-color: #f8f9fa; border-radius: 6px; padding: 10px;">
                <tr>
                    <td style="padding: 8px; font-weight: bold; color: #555;">Lead ID:</td>
                    <td style="padding: 8px; color: #111;">{latest_sample.get("lead_id", "-")}</td>
                    <td style="padding: 8px; font-weight: bold; color: #555;">Status:</td>
                    <td style="padding: 8px; color: #111;">{latest_sample.get("status", "-")}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; color: #555;">Lead Name:</td>
                    <td style="padding: 8px; color: #111;">{latest_sample.get("lead_name", "-")}</td>
                    <td style="padding: 8px; font-weight: bold; color: #555;">Created On:</td>
                    <td style="padding: 8px; color: #111;">{latest_sample.get("created_on", "-")}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; color: #555;">SOL ID / Branch:</td>
                    <td style="padding: 8px; color: #111;" colspan="3">{latest_sample.get("sol_id", "-")} - {latest_sample.get("branch", "-")}</td>
                </tr>
            </table>
        </div>
        <div style="background-color: #f1f3f5; color: #777; padding: 12px 24px; text-align: center; font-size: 12px;">
            Sahayog SCRM System Automated Notification
        </div>
    </div>
    """

    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        now=True
    )

# ==============================================================================
# METHOD: download_fast_lead_report(from_date, to_date, filters=None)
# PURPOSE: Triggered by user's 'DOWNLOAD' action on CRM Lead Report dashboard.
#          Instead of querying database, it opens the pre-generated master CSV
#          file on the server, parses the rows in Python, applies active
#          filters line-by-line, and streams the filtered CSV to the browser.
# ==============================================================================
@frappe.whitelist()
def download_fast_lead_report(from_date, to_date, filters=None):
    import datetime
    import csv
    import io

    report_path = frappe.get_site_path("private", "files", "lead_report.csv")
    if not os.path.exists(report_path):
        frappe.throw("Master lead report file not found on the server. Please contact administrator.")

    from_date, to_date = validate_date_range(from_date, to_date)
    ui_filters = frappe.parse_json(filters) if filters else {}

    # 1. Preferences & UI filters parsing
    user = frappe.session.user
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

    # UI Filters Standardizing
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

    current_emp_number = frappe.db.get_value("Employee", {"user_id": user}, "employee_number")

    # 2. Date parser helper
    def parse_csv_date(date_str):
        try:
            return datetime.datetime.strptime(date_str, "%d-%m-%Y").date()
        except:
            return None

    # Stream to memory
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    
    headers = [
        "Lead ID", "Status", "Lead Name", "Contact", "Source",
        "Product Code", "Product Name", "Amount",
        "Employee Name", "Employee ID", "Designation",
        "SOL ID", "Branch", "District", "Region", "Zone", "Created On", "Owner Email"
    ]
    writer.writerow(headers)

    with open(report_path, "r", encoding="utf-8") as f_in:
        reader = csv.reader(f_in)
        
        # Skip the header row
        try:
            next(reader)
        except StopIteration:
            pass

        for row in reader:
            if len(row) < 17:
                continue

            # A. Date Filter Check (row[16] is Created On)
            row_date = parse_csv_date(row[16])
            if not row_date or row_date < from_date or row_date > to_date:
                continue

            # B. Owner Preference (If no preference -> only own leads)
            if user != "Administrator" and not has_pref:
                if len(row) > 17 and row[17] != user:
                    continue

            # C. SOL ID Preference
            curr_sol = row[11]
            if sol_ids_pref and curr_sol not in sol_ids_pref:
                continue

            # D. Zone / Region Preference
            curr_zone = norm(row[15])
            curr_region = norm(row[14])
            if zones_pref and curr_zone not in zones_pref:
                continue
            
            region_match = True
            if is_all_regions:
                region_match = True
            elif regions_pref:
                allowed = set(regions_pref)
                for r in list(regions_pref):
                    allowed |= REGION_ALIAS_MAP.get(r, set())
                region_match = curr_region in allowed
            if not region_match:
                continue

            # E. UI Product Filter
            if products_pref and norm(row[5]) not in products_pref:
                continue

            # F. UI Source Filter
            if sources_pref and norm(row[4]) not in sources_pref:
                continue

            # Write matching row
            writer.writerow(row)

    filedata = output.getvalue().encode("utf-8")
    output.close()

    frappe.response['filename'] = f"filtered_lead_report_{from_date}_to_{to_date}.csv"
    frappe.response['filecontent'] = filedata
    frappe.response['type'] = "download"