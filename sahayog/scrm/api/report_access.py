import frappe
from frappe.utils import now_datetime, getdate, date_diff, format_date

def norm(val):
    if not val: return ""
    return str(val).lower().replace(" ", "").replace("_", "-").strip()
REGION_ALIAS_MAP = {
    "ho": {"ho", "headoffice", "head-office"},
    "headoffice": {"ho", "headoffice", "head-office"},
}

    
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
        result.append({
            "user": doc.user,
            "product": [d.product for d in doc.product],
            "source": [d.source for d in doc.source],
            "zone": [d.zone for d in doc.zone],
            "region": [d.region for d in doc.region],
            "sol_id": [str(d.sol_id) for d in doc.sol_id if d.sol_id],
        })
    return result

def get_branch_map(sol_ids):
    if not sol_ids: return {}
    branches = frappe.get_all("Sahayog Branch", filters={"sol_id": ["in", sol_ids]}, fields=["sol_id", "branch", "region", "district", "zone"])
    return {str(b.sol_id): b for b in branches}

def get_employee_map(lead_owners):
    if not lead_owners: return {}
    employees = frappe.get_all("Employee", filters={"user_id": ["in", lead_owners]}, fields=["employee_name", "employee_number", "designation", "user_id"])
    return {e.user_id: e for e in employees}

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
    
    # ---------- Preferences ----------
    is_all_regions = False # Initialize is_all_regions
    products_pref, sources_pref, zones_pref, regions_pref, sol_ids_pref = set(), set(), set(), set(), set()
    if user != "Administrator":
        pref_res = get_user_report_preference_record(user)
        
        # Enforce Report Preference record existence for non-Administrators
        if not pref_res:
            frappe.throw("You do not have a Report Preference record. Please contact your manager to set it up.")

        p = pref_res[0]
        is_all_regions = p.get("all_regions") # Assign is_all_regions from preferences
        products_pref = {norm(x) for x in p.get("product", [])}
        sources_pref = {norm(x) for x in p.get("source", [])}
        zones_pref = {norm(x) for x in p.get("zone", [])}
        regions_pref = {norm(x) for x in p.get("region", [])}
        sol_ids_pref = {str(x) for x in p.get("sol_id", [])}

    filters = frappe.parse_json(filters) if filters else {}

    # PRODUCT
    if "product" in filters:
        ui_products = {norm(x) for x in filters.get("product", [])}
        if not ui_products: products_pref = set()
        else: products_pref = products_pref.intersection(ui_products)

    # SOURCE
    if "source" in filters:
        ui_sources = {norm(x) for x in filters.get("source", [])}
        if not ui_sources: sources_pref = set()
        else: sources_pref = sources_pref.intersection(ui_sources)

    # ZONE
    if "zone" in filters:
        ui_zones = {norm(x) for x in filters.get("zone", [])}
        if not ui_zones: zones_pref = set()
        else: zones_pref = zones_pref.intersection(ui_zones)

    # REGION
    if "region" in filters:
       ui_regions = {norm(x) for x in filters.get("region", [])}
    if not ui_regions:
        regions_pref = set()
    else:
        regions_pref = regions_pref.intersection(ui_regions)

    # SOL ID
    if "sol_id" in filters:
        ui_sols = {str(x) for x in filters.get("sol_id", [])}
        if not ui_sols: sol_ids_pref = set()
        else: sol_ids_pref = sol_ids_pref.intersection(ui_sols)

    frappe.log_error(
        "CRM FINAL FILTER STATE",
        f"Products:{products_pref}, Sources:{sources_pref}, Zones:{zones_pref}, Regions:{regions_pref}, SOLs:{sol_ids_pref}"
    )

    # ---------- Fetch Leads ----------
    page_length = 20000
    start = 0
    leads = []

    while True:
        batch = frappe.get_all(
            "Lead",
            filters=[
                ["creation", ">=", f"{from_date} 00:00:00"],
                ["creation", "<=", f"{to_date} 23:59:59"]
            ],
            fields=["name", "status", "lead_name", "mobile_no", "phone", "source", "lead_owner", "sol_id", "creation"],
            order_by="creation desc",
            start=start,
            limit_page_length=page_length
        )
        if not batch: break
        leads.extend(batch)
        start += page_length

    frappe.log_error("CRM DEBUG 1", f"Total Raw Leads found in DB for range: {len(leads)}")

    if not leads:
        return {"leads": [], "stats": empty_stats()}

    # Pre-fetch details
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
        curr_sol = str(l.sol_id) if l.sol_id else ""
        
        # 1. SOL Pref Filter Check
        if sol_ids_pref and curr_sol not in sol_ids_pref:
            skip_reason_sol_pref += 1
            continue

        branch = branch_map.get(curr_sol) if curr_sol else None
        
        # 2. Zone/Region Check
        if branch:
            lead_zone = norm(branch.zone)
            lead_region = norm(branch.region)
            
            zone_match = not zones_pref or (lead_zone in zones_pref)
            
            region_match = True
            # If user preference is to include all regions, bypass specific region filtering
            if is_all_regions: 
                region_match = True
            elif regions_pref:
                allowed = set(regions_pref)
                for r in list(regions_pref):
                    allowed |= REGION_ALIAS_MAP.get(r, set())
                region_match = lead_region in allowed

            if not zone_match or not region_match:
                skip_reason_zone_region_mismatch += 1
                continue
        else:
            # Case: Lead has SOL ID but SOL ID not found in Sahayog Branch Doctype
            if curr_sol:
                frappe.log_error("CRM DEBUG: Missing Branch Master", f"SOL ID {curr_sol} found in Lead {l.name} but NOT in Sahayog Branch")
            
            if zones_pref or regions_pref:
                skip_reason_no_branch += 1
                continue

        # 3. Source Filter Check
        if sources_pref and norm(l.source) not in sources_pref:
            skip_reason_source += 1
            continue

        # 4. Product Logic
        l_products = product_map.get(l.name, [])
        matched_products = []
        
        if products_pref:
            matched_products = [p for p in l_products if norm(p.product) in products_pref]
            if not matched_products:
                skip_reason_product += 1
                continue 
        else:
            matched_products = l_products if l.l_products else [{}]

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

    # FINAL SUMMARY LOG
    frappe.log_error(
        "CRM FILTER SUMMARY", 
        f"Total DB Leads: {len(leads)}\n"
        f"Skipped (SOL Pref): {skip_reason_sol_pref}\n"
        f"Skipped (No Branch/SOL in Master): {skip_reason_no_branch}\n"
        f"Skipped (Zone/Region Mismatch): {skip_reason_zone_region_mismatch}\n"
        f"Skipped (Source Filter): {skip_reason_source}\n"
        f"Skipped (Product Filter): {skip_reason_product}\n"
        f"Final List Count: {len(final_leads)}"
    )

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
def queue_leads_export(from_date, to_date, filters=None):
    # Ensure current user is passed to the job
    user = frappe.session.user
    
    # Status ko 'processing' set karein taaki UI ko pata chale kaam shuru ho gaya hai
    frappe.cache().set_value(f"export_status_{user}", {"status": "processing"}, expires_in_sec=600)
    
    frappe.enqueue(
        method="sahayog.scrm.api.report_access.run_leads_export_job",
        queue="long", 
        timeout=3600, 
        user=user,
        from_date=from_date, 
        to_date=to_date, 
        filters=filters
    )
    return {"status": "queued"}

# Baaki Python logic (get_leads etc.) same rahega jo aapne diya hai.

def run_leads_export_job(user, from_date, to_date, filters=None):
    frappe.set_user(user)
    # Fetch ALL matching leads
    data = get_leads(from_date, to_date, filters=filters)
    leads = data.get("leads", [])
    
    headers = ["Sr.No.", "Status", "Lead ID", "Customer", "Contact", "Source", "Product Code", "Product Name", "Amount", "Employee Name", "Employee ID", "Designation", "SOL ID", "Branch", "District", "Region", "Zone", "Created On"]
    all_rows = [headers]

    for i, l in enumerate(leads):
        b = l.get("branch_info", {})
        all_rows.append([
            i + 1, l.status, l.name, l.lead_name or "", l.contact, l.source or "",
            l.product_code, l.product_name, l.amount, l.employee_name, l.employee_id, l.designation,
            l.sol_id or "-", b.get("branch", "-"), b.get("district", "-"), b.get("region", "-"), b.get("zone", "-"),
            format_date(l.creation, "dd-mm-yyyy")
    ])
    
    filename = f"crm_leads_{from_date}_to_{to_date}.csv"
    file_doc = frappe.get_doc({
        "doctype": "File", "file_name": filename,
        "content": "\n".join(",".join(f'"{str(c)}"' for c in r) for r in all_rows),
        "is_private": 1
    }).insert(ignore_permissions=True)

    status_data = {
        "status": "completed", "file_url": file_doc.file_url,
        "row_count": len(leads), "from_date": from_date, "to_date": to_date
    }
    frappe.cache().set_value(f"export_status_{user}", status_data, expires_in_sec=600)
    notify_user(user, f"Export Ready: {filename}. <a href='{file_doc.file_url}' target='_blank'>Download</a>")
    frappe.db.commit()

@frappe.whitelist()
def check_export_status():
    return frappe.cache().get_value(f"export_status_{frappe.session.user}") or {"status": "pending"}

def notify_user(user, message):
    notification_doc = frappe.new_doc("Notification Log")
    notification_doc.update({"for_user": user, "subject": "Lead Export Ready", "email_content": message, "type": "Alert", "document_type": "Lead"})
    notification_doc.insert(ignore_permissions=True)
    frappe.db.commit()
    
@frappe.whitelist()
def get_employee_performance_data(from_date, to_date):
    from_date, to_date = validate_date_range(from_date, to_date)

    leads = frappe.get_all(
        "Lead",
        filters=[
            ["creation", ">=", f"{from_date} 00:00:00"],
            ["creation", "<=", f"{to_date} 23:59:59"]
        ],
        fields=["lead_owner", "sol_id", "status", "name"]
    )

    if not leads:
        return []

    # Pre-fetch details for mapping
    sol_ids = {str(l.sol_id) for l in leads if l.sol_id}
    branch_map = get_branch_map(list(sol_ids))
    employee_map = get_employee_map(list({l.lead_owner for l in leads if l.lead_owner}))

    employee_stats = {}

    for l in leads:
        emp = employee_map.get(l.lead_owner)
        if not emp: continue

        key = emp.employee_number
        if key not in employee_stats:
            employee_stats[key] = {
                "employee_id": emp.employee_number,
                "employee_name": emp.employee_name,
                "designation": emp.designation or "-",
                "sol_id": l.sol_id or "-",
                "branch": "-",
                "region": "-",
                "zone": "-",
                "total_leads": 0,
                "total_converted": 0,
                "follow_ups": 0
            }

        employee_stats[key]["total_leads"] += 1
        if l.status == "Converted":
            employee_stats[key]["total_converted"] += 1
        if l.status == "Follow Up":
            employee_stats[key]["follow_ups"] += 1

        # Map Branch Details
        curr_sol = str(l.sol_id) if l.sol_id else ""
        branch = branch_map.get(curr_sol)
        if branch:
            employee_stats[key]["branch"] = branch.branch
            employee_stats[key]["region"] = branch.region
            employee_stats[key]["zone"] = branch.zone

    return list(employee_stats.values())