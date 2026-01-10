
import frappe
import csv
from frappe.utils import now_datetime
from frappe import response

@frappe.whitelist()
def get_user_report_preference_record(user, report_type="Lead"):
    """
    Fetch Report Preference with child tables (Table MultiSelect)
    """

    result = []

    # ADMIN → see all preferences
    if user == "Administrator":
        names = frappe.get_all("Report Preference", pluck="name")
    else:
        names = frappe.get_all(
            "Report Preference",
            filters={
                "user": user,
                "report_type": report_type
            },
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

            # Table MultiSelect fields
            "product": [d.product for d in doc.product],
            "source": [d.source for d in doc.source],
            "zone": [d.zone for d in doc.zone],
            "region": [d.region for d in doc.region],
            "sol_id": [d.sol_id for d in doc.sol_id],
        })

    return result
import frappe
from frappe.utils import getdate


def empty_stats():
    return {
        "total": 0,
        "converted": 0,
        "follow_up": 0,
        "not_interested": 0,
    }
@frappe.whitelist()
def get_leads(from_date, to_date):
    user = frappe.session.user

    # -------------------------------
    # 1️⃣ Preferences
    # -------------------------------
    if user == "Administrator":
        products_pref = sources_pref = zones_pref = regions_pref = []
        sol_ids_pref = []
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

    # -------------------------------
    # 2️⃣ Fetch Leads
    # -------------------------------
    filters = [
        ["creation", ">=", f"{from_date} 00:00:00"],
        ["creation", "<=", f"{to_date} 23:59:59"],
    ]

    leads = frappe.get_all(
        "Lead",
        filters=filters,
        fields=[
            "name",
            "status",
            "lead_name",
            "mobile_no",
            "phone",
            "source",
            "lead_owner",
            "sol_id",
            "creation"
        ],
        order_by="creation desc"
    )

    if not leads:
        return {"leads": [], "stats": empty_stats()}

    # -------------------------------
    # 3️⃣ Lead Products
    # -------------------------------
    lead_names = [l.name for l in leads]

    product_rows = frappe.get_all(
        "Lead Product",
        filters={"parent": ["in", lead_names]},
        fields=["parent", "product", "product_name", "product_amount"]
    )

    product_map = {}
    for p in product_rows:
        product_map.setdefault(p.parent, []).append({
            "product": p.product,
            "product_name": p.product_name,
            "product_amount": p.product_amount
        })

    # -------------------------------
    # 4️⃣ Branch Info
    # -------------------------------
    sol_ids = list({
        int(l.sol_id)
        for l in leads
        if l.sol_id and str(l.sol_id).isdigit()
    })

    branch_map = {}
    if sol_ids:
        branches = frappe.get_all(
            "Sahayog Branch",
            filters={"sol_id": ["in", sol_ids]},
            fields=["sol_id", "branch", "region", "district", "zone"]
        )
        branch_map = {int(b.sol_id): b for b in branches}

    # -------------------------------
    # 4.5️⃣ Employee Info (MOVED UP)
    # -------------------------------
    lead_owners = list({l.lead_owner for l in leads if l.lead_owner})
    employee_map = {}
    if lead_owners:
        employees = frappe.get_all(
            "Employee",
            filters={"user_id": ["in", lead_owners]},
            fields=["employee_name", "employee_number", "designation", "user_id"]
        )
        employee_map = {e.user_id: e for e in employees}

    # -------------------------------
    # 5️⃣ Populate Lead Details & Final Filtering
    # -------------------------------
    has_any_preference = any([
        products_pref,
        sources_pref,
        zones_pref,
        regions_pref,
        sol_ids_pref
    ])
    final_leads = []

    for l in leads:
        # Products & contact
        l.products = product_map.get(l.name, [])
        l.contact = l.mobile_no or l.phone or ""

        # Employee info
        emp = employee_map.get(l.lead_owner)
        l.employee_name = emp.employee_name if emp else None
        l.employee_id = emp.employee_number if emp else None
        l.designation = emp.designation if emp else None

        # Branch info (safe)
        try:
            sol_id_int = int(l.sol_id)
            branch = branch_map.get(sol_id_int)
        except (ValueError, TypeError):
            branch = None
        l.branch_info = branch

        # Preference matching (OR logic)
        match = False
        if products_pref and any(p["product"] in products_pref for p in l.products):
            match = True
        if sources_pref and l.source in sources_pref:
            match = True
        if sol_ids_pref and l.sol_id in sol_ids_pref:
            match = True
        if zones_pref and branch and branch.get("zone") in zones_pref:
            match = True
        if regions_pref and branch and branch.get("region") in regions_pref:
            match = True


        # Include lead ONLY if:
        # 1️⃣ At least one preference exists
        # 2️⃣ Lead matches at least one preference
        if has_any_preference and match:
           final_leads.append(l)

    if not final_leads:
        return {"leads": [], "stats": empty_stats()}

    # -------------------------------
    # 6️⃣ Stats
    # -------------------------------
    stats = {
        "total": len(final_leads),
        "converted": sum(1 for l in final_leads if l.status == "Converted"),
        "follow_up": sum(1 for l in final_leads if l.status == "Follow Up"),
        "not_interested": sum(1 for l in final_leads if l.status == "Not Interested"),
    }

    # ✅ DEBUG (optional)
    frappe.log_error(
        title="DEBUG SOL MAPPING",
        message=f"Lead SOL IDs: {sol_ids}\nBranch Map Keys: {list(branch_map.keys())}"
    )

    return {"leads": final_leads, "stats": stats}
#  -------------------------------
# Export Leads as CSV
# -------------------------------
@frappe.whitelist()
def export_leads(from_date, to_date):
    data = get_leads(from_date, to_date)
    leads = data.get("leads", [])

    if not leads:
        frappe.throw("No leads found for export")

    filename = f"CRM_Leads_Report_{now_datetime().strftime('%Y%m%d_%H%M%S')}.csv"

    headers = [
        "Sr.No.", "Status", "Lead ID", "Customer", "Contact", "Source",
        "Product Code", "Product Name", "Amount",
        "Employee Name", "Employee ID", "Designation",
        "SOL ID", "Branch", "District", "Region", "Zone", "Created On"
    ]

    output = []
    output.append(",".join(headers))

    for idx, l in enumerate(leads, start=1):

        product = l.products[0] if l.products else {}

        row = [
            idx,
            l.status,
            l.name,
            l.lead_name or "",
            l.contact or "",
            l.source or "",
            product.get("product", ""),
            product.get("product_name", ""),
            product.get("product_amount", ""),
            l.employee_name or "",
            l.employee_id or "",
            l.designation or "",
            l.sol_id or "",
            l.branch_info.branch if l.branch_info else "",
            l.branch_info.district if l.branch_info else "",
            l.branch_info.region if l.branch_info else "",
            l.branch_info.zone if l.branch_info else "",
            l.creation,
        ]

        output.append(",".join([f'"{str(col)}"' for col in row]))

    frappe.response.clear()
    frappe.response["type"] = "download"
    frappe.response["filename"] = filename
    frappe.response["filecontent"] = "\n".join(output)
# -------------------------------   
# Export Leads as CSV in Batches
# -------------------------------
@frappe.whitelist()
def export_leads_batch(from_date, to_date, limit=500, offset=0):
    limit = int(limit)
    offset = int(offset)

    data = get_leads(from_date, to_date)
    leads = data.get("leads", [])

    # Apply batching
    batch = leads[offset: offset + limit]

    if not batch:
        return None

    import csv
    from frappe import response
    from frappe.utils import now_datetime

    filename = f"CRM_Leads_{offset + 1}_{offset + len(batch)}.csv"

    response.filename = filename
    response.type = "download"

    headers = [
        "Sr.No.", "Status", "Lead ID", "Customer", "Contact", "Source",
        "Product Code", "Product Name", "Amount",
        "Employee Name", "Employee ID", "Designation",
        "SOL ID", "Branch", "District", "Region", "Zone", "Created On"
    ]

    rows = [headers]

    for index, l in enumerate(batch):
        sr_no = offset + index + 1

        product = l.products[0] if l.products else {}
        rows.append([
            sr_no,
            l.status,
            l.name,
            l.lead_name or "",
            l.contact or "",
            l.source or "",
            product.get("product", ""),
            product.get("product_name", ""),
            product.get("product_amount", ""),
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

    output = []
    for row in rows:
        output.append(",".join([f'"{str(col)}"' for col in row]))

    response.filecontent = "\n".join(output)
