
import frappe
from frappe.utils import now_datetime
from frappe.utils import getdate, date_diff
from frappe import response
from frappe.utils import format_date

MAX_EXPORT_BATCH_SIZE = 1000
def norm(val):
    if not val:
        return ""
    return (
        str(val)
        .lower()
        .replace(" ", "")   # REMOVE ALL SPACES
        .replace("_", "-")  # normalize separators
        .strip()
    )



# -------------------------------
# Get User Report Preference Record
# -------------------------------
@frappe.whitelist()
def get_user_report_preference_record(user, report_type="Lead"):
    result = []

    if user == "Administrator":
        names = frappe.get_all("Report Preference", pluck="name")
    else:
        names = frappe.get_all(
            "Report Preference",
            filters={"user": user, "report_type": report_type},
            pluck="name"
        )
        if not names:
            return None

    for name in names:
        doc = frappe.get_doc("Report Preference", name)
        result.append({
            "user": doc.user,
            "report_type": doc.report_type,
            "district": doc.district,
            "state": doc.state,
            "product": [d.product for d in doc.product],
            "source": [d.source for d in doc.source],
            "zone": [d.zone for d in doc.zone],
            "region": [d.region for d in doc.region],
            "sol_id": [d.sol_id for d in doc.sol_id],
        })

    return result
# -------------------------------
# Get Leads with Preferences Applied
# -------------------------------
def empty_stats():
    return {
        "total": 0,
        "converted": 0,
        "follow_up": 0,
        "not_interested": 0,
    }
# -------------------------------
# Caching Helpers
# -------------------------------
def get_branch_map(sol_ids):
    if not sol_ids:
        return {}

    cache_key = f"branch_map:{','.join(map(str, sol_ids))}"
    cached = frappe.cache().get_value(cache_key)
    if cached:
        return cached

    branches = frappe.get_all(
        "Sahayog Branch",
        filters={"sol_id": ["in", sol_ids]},
        fields=["sol_id", "branch", "region", "district", "zone"]
    )

    data = {int(b.sol_id): b for b in branches}
    frappe.cache().set_value(cache_key, data, expires_in_sec=300)
    return data

# -------------------------------
# Caching Helpers
# -------------------------------
def get_employee_map(lead_owners):
    if not lead_owners:
        return {}

    cache_key = f"employee_map:{','.join(lead_owners)}"
    cached = frappe.cache().get_value(cache_key)
    if cached:
        return cached

    employees = frappe.get_all(
        "Employee",
        filters={"user_id": ["in", lead_owners]},
        fields=["employee_name", "employee_number", "designation", "user_id"]
    )

    data = {e.user_id: e for e in employees}
    frappe.cache().set_value(cache_key, data, expires_in_sec=300)
    return data
# -------------------------------
# Get Leads with Preferences Applied        
@frappe.whitelist()
def get_leads(from_date, to_date, limit=100, offset=0):
    user = frappe.session.user
    from_date, to_date = validate_date_range(from_date, to_date)

    REGION_ALIAS = {
        "ho": "head office",
        "headoffice": "head office",
        "head-office": "head office",
    }

    def norm(val):
        if not val: return ""
        v = str(val).lower().replace("_", " ").replace("-", " ").strip()
        v = " ".join(v.split())
        return REGION_ALIAS.get(v, v)

    # ---------- Preferences Fetching ----------
    if user == "Administrator":
        products_pref = sources_pref = zones_pref = regions_pref = sol_ids_pref = set()
    else:
        pref_name = frappe.get_value("Report Preference", {"user": user, "report_type": "Lead"}, "name")
        if not pref_name:
            frappe.log_error("CRM DEBUG", f"No Report Preference found for user: {user}")
            return {"leads": [], "stats": empty_stats()}

        pref = frappe.get_doc("Report Preference", pref_name)
        products_pref = {norm(d.product) for d in pref.product if d.product}
        sources_pref = {norm(d.source) for d in pref.source if d.source}
        zones_pref = {norm(d.zone) for d in pref.zone if d.zone}
        regions_pref = {norm(d.region) for d in pref.region if d.region}
        sol_ids_pref = {str(d.sol_id).strip() for d in pref.sol_id if d.sol_id}

    # ---------- Raw Leads Fetching ----------
    leads = frappe.get_all(
        "Lead",
        filters=[
            ["creation", ">=", f"{from_date} 00:00:00"],
            ["creation", "<=", f"{to_date} 23:59:59"]
        ],
        fields=["name", "status", "lead_name", "mobile_no", "phone", "source", "lead_owner", "sol_id", "creation"],
        order_by="creation desc",
        limit_start=int(offset),
        limit_page_length=int(limit)
    )

    frappe.log_error("CRM STEP 1 - RAW FETCH", f"Found {len(leads)} leads in DB for date {from_date} to {to_date}")

    if not leads: return {"leads": [], "stats": empty_stats()}

    # ---------- Data Mapping ----------
    product_rows = frappe.get_all(
        "Lead Product", 
        filters={"parent": ["in", [l.name for l in leads]]}, 
        fields=["parent", "product", "product_name", "product_amount"]
    )
    product_map = {}
    for p in product_rows: product_map.setdefault(p.parent, []).append(p)

    sol_ids = tuple({int(l.sol_id) for l in leads if str(l.sol_id).isdigit()})
    branch_map = get_branch_map(sol_ids) if sol_ids else {}
    employee_map = get_employee_map(tuple({l.lead_owner for l in leads if l.lead_owner}))

    # ---------- Final Filter with Detailed Logs ----------
    final_leads = []

    for l in leads:
        # LOG 1: SOL Check
        if not l.sol_id:
            frappe.log_error("DROP - NO SOL", f"Lead: {l.name} has no SOL ID.")
            continue
        
        if sol_ids_pref and str(l.sol_id).strip() not in sol_ids_pref:
            frappe.log_error("DROP - SOL PREF", f"Lead: {l.name}, SOL: {l.sol_id} not in User Preference SOL list.")
            continue

        # LOG 2: Branch Data Check
        branch = branch_map.get(int(l.sol_id))
        if not branch:
            frappe.log_error("DROP - BRANCH MISSING", f"Lead: {l.name}, SOL: {l.sol_id} not found in Sahayog Branch master.")
            continue

        lead_zone = norm(branch.zone)
        lead_region = norm(branch.region)
        lead_source = norm(l.source)

        # LOG 3: Location Filters
        if zones_pref and lead_zone not in zones_pref:
            frappe.log_error("DROP - ZONE FILTER", f"Lead: {l.name}, Zone: {lead_zone} not in Allowed: {list(zones_pref)}")
            continue
        
        if regions_pref and lead_region not in regions_pref:
            frappe.log_error("DROP - REGION FILTER", f"Lead: {l.name}, Region: {lead_region} not in Allowed: {list(regions_pref)}")
            continue

        # LOG 4: Source Filter
        if sources_pref and lead_source not in sources_pref:
            frappe.log_error("DROP - SOURCE FILTER", f"Lead: {l.name}, Source: {lead_source} not in Allowed: {list(sources_pref)}")
            continue

        # LOG 5: Product Filter (1003 Fix)
        l_products = product_map.get(l.name, [])
        if products_pref:
            matched = [p for p in l_products if norm(p.get("product")) in products_pref]
            if not matched:
                product_list = [p.get('product') for p in l_products]
                frappe.log_error("DROP - PRODUCT FILTER", f"Lead: {l.name}, Lead Products: {product_list} not in User Preference: {list(products_pref)}")
                continue
            l_products = matched

        # ---------- Success: Enriching Data ----------
        l.branch_info = branch
        l.region = "Head Office" if lead_region == "head office" else branch.region
        
        emp = employee_map.get(l.lead_owner)
        l.employee_name = emp.employee_name if emp else None
        l.employee_id = emp.employee_number if emp else None
        l.designation = emp.designation if emp else None
        l.products = l_products
        
        if l_products:
            l.product_code = l_products[0].get("product")
            l.product_name = l_products[0].get("product_name")
            l.amount = l_products[0].get("product_amount")
        else:
            l.product_code = l.product_name = l.amount = "-"

        l.contact = l.mobile_no or l.phone or ""
        final_leads.append(l)

    frappe.log_error("CRM STEP 2 - FINAL LIST", f"Final displayed leads: {len(final_leads)} after all filters.")
    
    return {
        "leads": final_leads,
        "stats": {
            "total": len(final_leads),
            "converted": sum(l.status == "Converted" for l in final_leads),
            "follow_up": sum(l.status == "Follow Up" for l in final_leads),
            "not_interested": sum(l.status == "Not Interested" for l in final_leads),
        }
    }
# -------------------------------   
# Export Leads as CSV in Batches
# -------------------------------
@frappe.whitelist()
def export_leads_batch(from_date, to_date, limit=500, offset=0):
    # 1️⃣ Date validation
    from_date, to_date = validate_date_range(from_date, to_date)

    # 2️⃣ Permission check
    if not frappe.has_permission("Lead", "read"):
        frappe.throw("Not permitted", frappe.PermissionError)

    limit = int(limit)
    offset = int(offset)

    # 3️⃣ Hard batch limit
    if limit > MAX_EXPORT_BATCH_SIZE:
        frappe.throw(
            f"Batch export limit cannot exceed {MAX_EXPORT_BATCH_SIZE} rows"
        )

    # 4️⃣ Fetch leads (pagination-safe)
    data = get_leads(
        from_date,
        to_date,
        limit=limit,
        offset=offset
    )

    leads = data.get("leads", [])
    if not leads:
        return None

    # 5️⃣ File naming (DATE + ROW RANGE)
    start = offset + 1
    end = offset + len(leads)

    filename = (
        f"crm_leads_{from_date}_to_{to_date}_"
        f"{start}_to_{end}.csv"
    )

    headers = [
        "Sr.No.", "Status", "Lead ID", "Customer", "Contact", "Source",
        "Product Code", "Product Name", "Amount",
        "Employee Name", "Employee ID", "Designation",
        "SOL ID", "Branch", "District", "Region", "Zone", "Created On"
    ]

    rows = [headers]

    for i, l in enumerate(leads):
        p = l.products[0] if l.products else {}
        b = l.branch_info or {}

        rows.append([
            offset + i + 1,
            l.status,
            l.name,
            l.lead_name or "",
            l.contact or "",
            l.source or "",
            p.get("product", ""),
            p.get("product_name", ""),
            p.get("product_amount", ""),
            l.employee_name or "",
            l.employee_id or "",
            l.designation or "",
            l.sol_id or "",
            b.get("branch", ""),
            b.get("district", ""),
            b.get("region", ""),
            b.get("zone", ""),
            l.creation,
        ])

    # 6️⃣ CSV response
    frappe.response.type = "download"
    frappe.response.filename = filename
    frappe.response.filecontent = "\n".join(
        ",".join(f'"{c}"' for c in row) for row in rows
    )

    # 7️⃣ Metadata for frontend success message
    frappe.response["export_info"] = {
        "rows": len(leads),
        "filename": filename,
        "from_date": from_date,
        "to_date": to_date,
        "range": f"{start}-{end}"
    }

# -------------------------------   
# Validate Date Range
# -------------------------------
MAX_DATE_RANGE_DAYS = 90

def validate_date_range(from_date, to_date):
    if not from_date or not to_date:
        frappe.throw("From Date and To Date are required")

    try:
        from_dt = getdate(from_date)
        to_dt = getdate(to_date)
    except Exception:
        frappe.throw("Invalid date format")

    if from_dt > to_dt:
        frappe.throw("From Date cannot be greater than To Date")

    if date_diff(to_dt, from_dt) > MAX_DATE_RANGE_DAYS:
        frappe.throw(
            f"Date range cannot exceed {MAX_DATE_RANGE_DAYS} days"
        )

    return from_dt, to_dt
# -------------------------------   
# Queue Leads Export Job
# -------------------------------
@frappe.whitelist()
def queue_leads_export(from_date, to_date):
    from_date, to_date = validate_date_range(from_date, to_date)

    frappe.enqueue(
        method="sahayog.scrm.api.report_access.run_leads_export_job",
        queue="long",
        timeout=1800,
        job_name=f"CRM Leads Export - {frappe.session.user}",
        user=frappe.session.user,
        from_date=str(from_date),
        to_date=str(to_date)
    )

    return {"status": "queued"}


# -------------------------------   
# Run Leads Export Job
# -------------------------------
def run_leads_export_job(user, from_date, to_date):
    frappe.set_user(user)
    offset = 0
    limit = 1000
    all_rows = []

    headers = [
        "Sr.No.", "Status", "Lead ID", "Customer", "Contact", "Source",
        "Product Code", "Product Name", "Amount",
        "Employee Name", "Employee ID", "Designation",
        "SOL ID", "Branch", "District", "Region", "Zone", "Created On"
    ]
    all_rows.append(headers)

    sr_no = 1
    while True:
        data = get_leads(from_date, to_date, limit, offset)
        leads = data.get("leads", [])
        if not leads:
            break
            
        for l in leads:
            p = l.products[0] if l.products else {}
            b = l.branch_info or {}
            
            # ✅ Requirement: Created On in dd-mm-yyyy format
            formatted_date = format_date(l.creation, "dd-mm-yyyy")

            all_rows.append([
                sr_no, l.status, l.name, l.lead_name or "",
                l.contact or "", l.source or "",
                p.get("product", ""), p.get("product_name", ""),
                p.get("product_amount", ""),
                l.employee_name or "", l.employee_id or "",
                l.designation or "", l.sol_id or "",
                b.get("branch", ""), b.get("district", ""),
                b.get("region", ""), b.get("zone", ""),
                formatted_date,
            ])
            sr_no += 1
        offset += limit

    if len(all_rows) == 1:
        notify_user(user, "No leads found for the selected filters.")
        return

    filename = f"crm_leads_{from_date}_to_{to_date}.csv"
    
    # ✅ Create File only ONCE
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": filename,
        "content": "\n".join(",".join(f'"{c}"' for c in r) for r in all_rows),
        "is_private": 1
    }).insert(ignore_permissions=True)

    # ✅ Set Cache for Polling
    cache_key = f"export_status_{user}"
    frappe.cache().set_value(cache_key, file_doc.file_url, expires_in_sec=600)

    # ✅ Notification Log (Bell Icon)
    notify_user(user, f"Export Ready: {filename}. <a href='{file_doc.file_url}' target='_blank'>Download</a>")
    
    frappe.db.commit()

    # ✅ Requirement: Auto-delete to save storage (After 1 hour)
    frappe.enqueue(
        "frappe.utils.file_manager.delete_file_data_content",
        file_data_name=file_doc.name,
        now=False,
        at_front=False,
        after_commit=True,
        enqueue_after_delay=3600
    )
# --- ISSE BAHAR RAKHEIN ---
@frappe.whitelist()
def check_export_status():
    user = frappe.session.user
    cache_key = f"export_status_{user}"
    file_url = frappe.cache().get_value(cache_key)
    
    if file_url:
        frappe.cache().delete_value(cache_key) # Clean up
        return {"status": "completed", "file_url": file_url}
    
    return {"status": "pending"}
# -------------------------------   
# Notify User via Realtime
# -------------------------------
def notify_user(user, message):
    """
    Creates a System Notification (Bell Icon) for the user.
    This bypasses Socket.io issues.
    """
    # Create a new Notification Log entry
    notification_doc = frappe.new_doc("Notification Log")
    notification_doc.for_user = user
    notification_doc.subject = "Lead Export Ready"
    notification_doc.email_content = message  # This contains the HTML download link
    notification_doc.type = "Alert"
    notification_doc.document_type = "Lead"
    notification_doc.insert(ignore_permissions=True)
    
    # Crucial: Commit changes so the background worker saves the record
    frappe.db.commit()

    frappe.log_error("CRM NOTIFICATION SENT", f"User: {user}")
