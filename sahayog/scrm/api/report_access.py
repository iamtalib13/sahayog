import frappe
from frappe.utils import now_datetime, getdate, date_diff, format_date

def norm(val):
    if not val: return ""
    return str(val).lower().replace(" ", "").replace("_", "-").strip()

@frappe.whitelist()
def get_user_report_preference_record(user, report_type="Lead"):
    frappe.log_error(f"CRM Preference Fetch", f"User: {user}")
    result = []
    if user == "Administrator":
        names = frappe.get_all("Report Preference", pluck="name")
    else:
        names = frappe.get_all("Report Preference", filters={"user": user, "report_type": report_type}, pluck="name")
    
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
def get_leads(from_date, to_date, limit=None, offset=0):
    user = frappe.session.user
    from_date, to_date = validate_date_range(from_date, to_date)
    
    # ---------- Preferences ----------
    products_pref, sources_pref, zones_pref, regions_pref, sol_ids_pref = set(), set(), set(), set(), set()
    if user != "Administrator":
        pref_res = get_user_report_preference_record(user)
        if pref_res:
            p = pref_res[0]
            products_pref = {norm(x) for x in p.get("product", [])}
            sources_pref = {norm(x) for x in p.get("source", [])}
            zones_pref = {norm(x) for x in p.get("zone", [])}
            regions_pref = {norm(x) for x in p.get("region", [])}
            sol_ids_pref = {str(x) for x in p.get("sol_id", [])}

    # ---------- Fetch Leads (Unlimited within Date Range) ----------
    leads = frappe.get_all(
        "Lead",
        filters=[["creation", ">=", f"{from_date} 00:00:00"], ["creation", "<=", f"{to_date} 23:59:59"]],
        fields=["name", "status", "lead_name", "mobile_no", "phone", "source", "lead_owner", "sol_id", "creation"],
        order_by="creation desc",
        limit_page_length=0 # No limit, saara data uthayega
    )

    frappe.log_error("CRM DEBUG 1", f"Total Leads found in DB for range: {len(leads)}")

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
        
        # ✅ FIX: SOL Preference filter sirf tab chalega jab preference set ho
        if sol_ids_pref and curr_sol not in sol_ids_pref:
            continue

        branch = branch_map.get(curr_sol) if curr_sol else None
        
        # ✅ FIX: Zone/Region check (Sirf tab drop karein agar pref set ho aur match na kare)
        if branch:
            lead_zone = norm(branch.zone)
            lead_region = norm(branch.region)
            if zones_pref and lead_zone not in zones_pref: continue
            if regions_pref and lead_region not in regions_pref: continue
        else:
            # Agar lead mein SOL nahi hai par user ne Zone select kiya hai, toh wo lead nahi dikhegi
            if zones_pref or regions_pref:
                continue

        # Source Filter
        if sources_pref and norm(l.source) not in sources_pref:
            continue

        # ✅ FIX: Product Logic - Har product ki alag row
        l_products = product_map.get(l.name, [])
        matched_products = []
        
        if products_pref:
            matched_products = [p for p in l_products if norm(p.product) in products_pref]
            if not matched_products: continue # Agar preference se match nahi hua toh skip
        else:
            # Agar preference nahi hai, toh saare products dikhao, ya default '-'
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

    frappe.log_error("CRM DEBUG 2", f"Final Filtered Leads: {len(final_leads)}")

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
def queue_leads_export(from_date, to_date):
    frappe.enqueue(
        method="sahayog.scrm.api.report_access.run_leads_export_job",
        queue="long", timeout=3600, user=frappe.session.user,
        from_date=str(from_date), to_date=str(to_date)
    )
    return {"status": "queued"}

def run_leads_export_job(user, from_date, to_date):
    frappe.set_user(user)
    # Fetch ALL matching leads
    data = get_leads(from_date, to_date)
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