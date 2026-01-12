
import frappe
import csv
from frappe.utils import now_datetime
from frappe import response
import frappe
from frappe.utils import getdate

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

def empty_stats():
    return {
        "total": 0,
        "converted": 0,
        "follow_up": 0,
        "not_interested": 0,
    }
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

@frappe.whitelist()
def get_leads(from_date, to_date, limit=100, offset=0):
    user = frappe.session.user

    # ---------------- Preferences ----------------
    if user == "Administrator":
        products_pref = sources_pref = zones_pref = regions_pref = sol_ids_pref = []
    else:
        pref_name = frappe.get_value(
            "Report Preference",
            {"user": user, "report_type": "Lead"},
            "name"
        )
        if not pref_name:
            return {"leads": [], "stats": empty_stats()}

        pref = frappe.get_doc("Report Preference", pref_name)
        products_pref = [d.product for d in pref.product]
        sources_pref = [d.source for d in pref.source]
        zones_pref = [d.zone for d in pref.zone]
        regions_pref = [d.region for d in pref.region]
        sol_ids_pref = [d.sol_id for d in pref.sol_id]

    # ---------------- Leads ----------------
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

    if not leads:
        return {"leads": [], "stats": empty_stats()}

    # ---------------- Products ----------------
    lead_names = [l.name for l in leads]
    product_rows = frappe.get_all(
        "Lead Product",
        filters={"parent": ["in", lead_names]},
        fields=["parent", "product", "product_name", "product_amount"]
    )

    product_map = {}
    for p in product_rows:
        product_map.setdefault(p.parent, []).append(p)

    # ---------------- Branch & Employee ----------------
    sol_ids = tuple({int(l.sol_id) for l in leads if str(l.sol_id).isdigit()})
    lead_owners = tuple({l.lead_owner for l in leads if l.lead_owner})

    branch_map = get_branch_map(sol_ids) if sol_ids else {}
    employee_map = get_employee_map(lead_owners) if lead_owners else {}

    # ---------------- Final Filter ----------------
    final_leads = []
    has_pref = any([products_pref, sources_pref, zones_pref, regions_pref, sol_ids_pref])

    for l in leads:
        l.products = product_map.get(l.name, [])
        l.contact = l.mobile_no or l.phone or ""

        emp = employee_map.get(l.lead_owner)
        l.employee_name = emp.employee_name if emp else None
        l.employee_id = emp.employee_number if emp else None
        l.designation = emp.designation if emp else None

        branch = branch_map.get(int(l.sol_id)) if str(l.sol_id).isdigit() else None
        l.branch_info = branch

        match = (
            (products_pref and any(p.product in products_pref for p in l.products)) or
            (sources_pref and l.source in sources_pref) or
            (sol_ids_pref and l.sol_id in sol_ids_pref) or
            (zones_pref and branch and branch.zone in zones_pref) or
            (regions_pref and branch and branch.region in regions_pref)
        )

        if has_pref and match:
            final_leads.append(l)

    stats = {
        "total": len(final_leads),
        "converted": sum(l.status == "Converted" for l in final_leads),
        "follow_up": sum(l.status == "Follow Up" for l in final_leads),
        "not_interested": sum(l.status == "Not Interested" for l in final_leads),
    }

    return {"leads": final_leads, "stats": stats}

#  -------------------------------
# Export Leads as CSV
# -------------------------------
@frappe.whitelist()
def export_leads(from_date, to_date):
    data = get_leads(from_date, to_date)
    leads = data.get("leads", [])

    if not leads:
        frappe.throw("No leads found")

    filename = f"CRM_Leads_{now_datetime().strftime('%Y%m%d_%H%M%S')}.csv"

    headers = [
        "Sr.No.", "Status", "Lead ID", "Customer", "Contact", "Source",
        "Product Code", "Product Name", "Amount",
        "Employee Name", "Employee ID", "Designation",
        "SOL ID", "Branch", "District", "Region", "Zone", "Created On"
    ]

    rows = [headers]

    for i, l in enumerate(leads, start=1):
        p = l.products[0] if l.products else {}
        rows.append([
            i, l.status, l.name, l.lead_name, l.contact, l.source,
            p.get("product", ""), p.get("product_name", ""), p.get("product_amount", ""),
            l.employee_name, l.employee_id, l.designation,
            l.sol_id,
            l.branch_info.branch if l.branch_info else "",
            l.branch_info.district if l.branch_info else "",
            l.branch_info.region if l.branch_info else "",
            l.branch_info.zone if l.branch_info else "",
            l.creation
        ])

    response.type = "download"
    response.filename = filename
    response.filecontent = "\n".join(
        ",".join(f'"{c}"' for c in r) for r in rows
    )

# -------------------------------   
# Export Leads as CSV in Batches
# -------------------------------
@frappe.whitelist()
def export_leads_batch(from_date, to_date, limit=500, offset=0):
    limit = int(limit)
    offset = int(offset)

    data = get_leads(from_date, to_date, limit=limit, offset=offset)
    leads = data.get("leads", [])

    if not leads:
        return None

    filename = f"CRM_Leads_{offset+1}_{offset+len(leads)}.csv"

    headers = [
        "Sr.No.", "Status", "Lead ID", "Customer", "Contact", "Source",
        "Product Code", "Product Name", "Amount",
        "Employee Name", "Employee ID", "Designation",
        "SOL ID", "Branch", "District", "Region", "Zone", "Created On"
    ]

    rows = [headers]

    for i, l in enumerate(leads):
        p = l.products[0] if l.products else {}
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
            l.branch_info.branch if l.branch_info else "",
            l.branch_info.district if l.branch_info else "",
            l.branch_info.region if l.branch_info else "",
            l.branch_info.zone if l.branch_info else "",
            l.creation,
        ])

    response.type = "download"
    response.filename = filename
    response.filecontent = "\n".join(
        ",".join(f'"{c}"' for c in row) for row in rows
    )
