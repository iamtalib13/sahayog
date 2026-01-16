
import frappe
from frappe.utils import now_datetime
from frappe.utils import getdate, date_diff
from frappe import response

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

    # ---------- Region Alias ----------
    REGION_ALIAS = {
        "ho": "headoffice",
        "head-office": "headoffice",
        "head office": "headoffice",
    }

    # ---------- Normalizer ----------
    def norm(val):
        if not val:
            return ""
        v = str(val).lower().replace(" ", "").replace("_", "-").strip()
        return REGION_ALIAS.get(v, v)

    # ---------- Preferences ----------
    if user == "Administrator":
        products_pref = set()
        sources_pref = set()
        zones_pref = set()
        regions_pref = set()
        sol_ids_pref = set()
    else:
        pref_name = frappe.get_value(
            "Report Preference",
            {"user": user, "report_type": "Lead"},
            "name"
        )
        if not pref_name:
            return {"leads": [], "stats": empty_stats()}

        pref = frappe.get_doc("Report Preference", pref_name)

        products_pref = {norm(d.product) for d in pref.product}
        sources_pref = {norm(d.source) for d in pref.source}
        zones_pref = {norm(d.zone) for d in pref.zone}
        regions_pref = {norm(d.region) for d in pref.region}
        sol_ids_pref = {str(d.sol_id) for d in pref.sol_id if d.sol_id}

    # ---------- Leads ----------
    leads = frappe.get_all(
        "Lead",
        filters=[
            ["creation", ">=", f"{from_date} 00:00:00"],
            ["creation", "<=", f"{to_date} 23:59:59"],
        ],
        fields=[
            "name", "status", "lead_name", "mobile_no", "phone",
            "source", "lead_owner", "sol_id", "creation"
        ],
        order_by="creation desc",
        limit_start=int(offset),
        limit_page_length=int(limit)
    )

    frappe.log_error("CRM DEBUG 1 - RAW LEADS", f"{len(leads)} leads fetched")

    if not leads:
        return {"leads": [], "stats": empty_stats()}

    # ---------- Products ----------
    product_rows = frappe.get_all(
        "Lead Product",
        filters={"parent": ["in", [l.name for l in leads]]},
        fields=["parent", "product", "product_name", "product_amount"]
    )

    product_map = {}
    for p in product_rows:
        product_map.setdefault(p.parent, []).append({
            "product": p.product,
            "product_name": p.product_name,
            "product_amount": p.product_amount
        })

    # ---------- Branch & Employee ----------
    sol_ids = tuple({int(l.sol_id) for l in leads if str(l.sol_id).isdigit()})
    branch_map = get_branch_map(sol_ids) if sol_ids else {}
    employee_map = get_employee_map(
        tuple({l.lead_owner for l in leads if l.lead_owner})
    )

    # ---------- Final Filter ----------
    final_leads = []

    for l in leads:
        frappe.log_error("CRM DEBUG LOOP", f"{l.name} | SOL {l.sol_id}")

        # ---------- SOL validation ----------
        if not l.sol_id or not str(l.sol_id).isdigit():
            frappe.log_error("DROP - INVALID SOL", l.sol_id)
            continue

        if sol_ids_pref and str(l.sol_id) not in sol_ids_pref:
            frappe.log_error("DROP - SOL PREF", f"SOL={l.sol_id}")
            continue

        branch = branch_map.get(int(l.sol_id))
        if not branch:
            frappe.log_error("DROP - BRANCH NOT FOUND", l.sol_id)
            continue

        lead_zone = norm(branch.zone)
        lead_region = norm(branch.region)

        frappe.log_error(
            "CRM ZONE CHECK",
            f"""
            Lead: {l.name}
            Branch Zone RAW: '{branch.zone}'
            Branch Zone NORM: '{lead_zone}'
            Pref Zones: {list(zones_pref)}
            """
        )

        # ---------- Primary Filters ----------
        if zones_pref and lead_zone not in zones_pref:
            frappe.log_error(
                "DROP - ZONE",
                f"Lead Zone={lead_zone}, Allowed={zones_pref}"
            )
            continue

        if regions_pref and lead_region not in regions_pref:
            frappe.log_error(
                "DROP - REGION",
                f"Lead Region={lead_region}, Allowed={regions_pref}"
            )
            continue

        # ---------- Secondary Filters ----------
        l_products = product_map.get(l.name, [])
        allowed_products = l_products
        # Filter products strictly according to preference
        if products_pref:
           allowed_products = [
                p for p in l_products
                if norm(p.get("product")) in products_pref
            ]
        if not allowed_products:
           frappe.log_error("DROP - PRODUCT EMPTY", l.name)
           continue
        l_products = allowed_products

        product_codes = {p['product'] for p in l_products}

        frappe.log_error("DEBUG PRODUCT", str(l_products))
        frappe.log_error("PRODUCT PREF CHECK", f"{[d.product for d in pref.product]} | norm: {products_pref}")
        
        frappe.log_error(
        "ALL PRODUCTS FOR LEAD",
        f"{l.name} => {[p.get('product') for p in l_products]}"
)


        # ---------- Source Filter (STRICT) ----------
        if sources_pref:
            lead_source = norm(l.source)
            if lead_source not in sources_pref:
                frappe.log_error(
                    "DROP - SOURCE",
                    f"Lead Source={lead_source}, Allowed={sources_pref}"
                )
                continue

        # ---------- Enrich ----------
        emp = employee_map.get(l.lead_owner)
        l.employee_name = emp.employee_name if emp else None
        l.employee_id = emp.employee_number if emp else None
        l.designation = emp.designation if emp else None
        l.products = l_products

        # ---------- Product display ----------
        if l_products:
            l.product_code = l_products[0].get("product")
            l.product_name = l_products[0].get("product_name")
            l.amount = l_products[0].get("product_amount")
        else:
            l.product_code = "-"
            l.product_name = "-"
            l.amount = "-"

        l.contact = l.mobile_no or l.phone or ""
        l.branch_info = branch

        final_leads.append(l)

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
