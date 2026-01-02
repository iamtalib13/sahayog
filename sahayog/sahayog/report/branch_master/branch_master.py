import frappe

def execute(filters=None):
    filters = filters or {}
    search_text = (filters.get("branch_search") or "").strip()

    columns = get_columns()

    if not search_text:
        data = [{"branch_name": "Enter Branch / SOL ID to search", "branch_sol_id": "", "state_code": "", "state": "", "district": "", "zone": "", "region": "", "branch_address": "", "branch_opening_date": "", "email": ""}]
        return columns, data

    # Parse sol_id from autocomplete format "123 - Branch Name (District)"
    parts = search_text.split(" - ")
    sol_id_candidate = parts[0].strip() if parts else ""

    branch_doc = None
    if sol_id_candidate.isdigit():
        branch_doc = frappe.get_doc("Sahayog Branch", {"sol_id": int(sol_id_candidate)}, ignore_missing=True)
    
    if not branch_doc:
        # Fallback to branch name search
        branch_docs = frappe.get_all("Sahayog Branch", filters={"branch": ["like", f"%{search_text}%"]}, fields=["name"], limit=1)
        if branch_docs:
            branch_doc = frappe.get_doc("Sahayog Branch", branch_docs[0].name)

    if not branch_doc:
        data = [{"branch_name": "No branch found with this SOL ID or Branch Name. Please check and try again.", "branch_sol_id": "", "state_code": "", "state": "", "state": "", "district": "", "zone": "", "region": "", "branch_address": "", "branch_opening_date": "", "email": ""}]
        return columns, data

    data = [{
        "branch_name": branch_doc.branch,
        "branch_sol_id": branch_doc.sol_id,
        "state_code": branch_doc.state_code or "",
        "state": branch_doc.state,
        "district": branch_doc.district,
        "zone": branch_doc.zone,
        "region": branch_doc.region,
        "branch_address": getattr(branch_doc, 'branch_address', '') or "",
        "branch_opening_date": branch_doc.branch_opening_date,
        "email": branch_doc.email or ""
    }]
    return columns, data


def get_columns():
    return [
        {"label": "Branch Name", "fieldname": "branch_name", "fieldtype": "Data", "width": 220},
        {"label": "Branch SOL ID", "fieldname": "branch_sol_id", "fieldtype": "Int", "width": 110},
        {"label": "State Code", "fieldname": "state_code", "fieldtype": "Data", "width": 90},
        {"label": "State", "fieldname": "state", "fieldtype": "Data", "width": 120},
        {"label": "District / Cluster", "fieldname": "district", "fieldtype": "Data", "width": 150},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 90},
        {"label": "Region", "fieldname": "region", "fieldtype": "Data", "width": 110},
        {"label": "Branch Address", "fieldname": "branch_address", "fieldtype": "Data", "width": 250},
        {"label": "Branch Opening Date", "fieldname": "branch_opening_date", "fieldtype": "Date", "width": 110},
        {"label": "Branch Email", "fieldname": "email", "fieldtype": "Data", "width": 200},
    ]


@frappe.whitelist()
def get_branch_suggestions(text):
    """FIXED: Use dict filters, not list-of-lists"""
    if not text or len(text) < 2:
        return []

    filters = {
        "or": [
            {"sol_id": ["like", f"{text}%"]},
            {"branch": ["like", f"%{text}%"]}
        ]
    }
    
    return frappe.get_all(
        "Sahayog Branch",
        filters=filters,
        fields=["sol_id", "branch", "district"],
        limit=20,
        order_by="sol_id asc, branch asc"
    )
