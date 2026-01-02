import frappe

# def execute(filters=None):
#     filters = filters or {}
#     search_text = (filters.get("branch_search") or "").strip()

#     columns = get_columns()

#     if not search_text:
#         # Show friendly empty state
#         data = [{
#             "branch_name": "No branch selected",
#             "branch_sol_id": "",
#             "state_code": "",
#             "state": "",
#             "district": "",
#             "zone": "",
#             "region": "",
#             "branch_address": "",
#             "branch_opening_date": "",
#             "email": ""
#         }]
#         return columns, data

#     # Expect format "SOLID - Branch Name (...)" from Autocomplete; take first token as sol_id if numeric
#     sol_id_candidate = search_text.split(" - ")[0].strip()
#     branch_doc = None

#     if sol_id_candidate.isdigit():
#         branch_doc = frappe.db.get_value(
#             "Sahayog Branch",
#             {"sol_id": int(sol_id_candidate)},
#             ["name", "sol_id", "branch", "state_code", "state", "district",
#              "zone", "region", "branch_address", "branch_opening_date", "email"],
#             as_dict=True
#         )

#     if not branch_doc:
#         # fallback: search by branch name (case-insensitive, partial)
#         branch_doc = frappe.db.get_value(
#             "Sahayog Branch",
#             {"branch": ["like", f"%{search_text}%"]},
#             ["name", "sol_id", "branch", "state_code", "state", "district",
#              "zone", "region", "branch_address", "branch_opening_date", "email"],
#             as_dict=True
#         )

#     if not branch_doc:
#         data = [{
#             "branch_name": "No branch found",
#             "branch_sol_id": "",
#             "state_code": "",
#             "state": "",
#             "district": "",
#             "zone": "",
#             "region": "",
#             "branch_address": "",
#             "branch_opening_date": "",
#             "email": ""
#         }]
#         return columns, data

#     data = [{
#         "branch_name": branch_doc.branch,
#         "branch_sol_id": branch_doc.sol_id,
#         "state_code": branch_doc.state_code,
#         "state": branch_doc.state,
#         "district": branch_doc.district,
#         "zone": branch_doc.zone,
#         "region": branch_doc.region,
#         "branch_address": branch_doc.branch_address,
#         "branch_opening_date": branch_doc.branch_opening_date,
#         "email": branch_doc.email
#     }]

#     return columns, data


def execute(filters=None):
    filters = filters or {}
    search_text = (filters.get("branch_search") or "").strip()

    columns = get_columns()

    if not search_text:
        data = [{"branch_name": "Enter SOL ID or Branch Name", "branch_sol_id": "", "state_code": "", "state": "", "district": "", "zone": "", "region": "", "branch_address": "", "branch_opening_date": "", "email": ""}]
        return columns, data

    sol_id_candidate = search_text.split(" - ")[0].strip()
    
    # FIXED: Get FULL doc using name from get_value
    if sol_id_candidate.isdigit():
        branch_name = frappe.db.get_value("Sahayog Branch", {"sol_id": int(sol_id_candidate)}, "name")
        if branch_name:
            branch_doc = frappe.get_doc("Sahayog Branch", branch_name)
        else:
            branch_doc = None
    else:
        # Branch name search
        branch_name = frappe.db.get_value("Sahayog Branch", {"branch": ["like", f"%{search_text}%"]}, "name")
        branch_doc = frappe.get_doc("Sahayog Branch", branch_name) if branch_name else None

    if not branch_doc:
        data = [{"branch_name": f"No branch found for '{search_text}'", "branch_sol_id": "", "state_code": "", "state": "", "district": "", "zone": "", "region": "", "branch_address": "", "branch_opening_date": "", "email": ""}]
        return columns, data

    # Map fields
    data = [{
        "branch_name": branch_doc.branch,
        "branch_sol_id": branch_doc.sol_id,
        "state_code": getattr(branch_doc, 'state_code', ''),
        "state": branch_doc.state,
        "district": branch_doc.district,
        "zone": branch_doc.zone,
        "region": branch_doc.region,
        "branch_address": getattr(branch_doc, 'branch_address', ''),
        "branch_opening_date": branch_doc.branch_opening_date,
        "email": getattr(branch_doc, 'email', '')
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


# @frappe.whitelist()
# def get_branch_suggestions(text):
#     text = (text or "").strip()
#     if not text:
#         return []

#     # match by sol_id (starts with) OR branch (like)
#     return frappe.db.get_list(
#         "Sahayog Branch",
#         filters=[
#             ["Sahayog Branch", "sol_id", "like", f"{text}%"],
#             "or",
#             ["Sahayog Branch", "branch", "like", f"%{text}%"]
#         ],
#         fields=["sol_id", "branch", "district"],
#         limit_page_length=20,
#         order_by="branch asc"
#     )


@frappe.whitelist()
def get_branch_suggestions(text):
    text = (text or "").strip()
    if not text:
        return []

    # FIXED: Use frappe.db.sql instead of get_list for complex OR
    sql = """
        SELECT sol_id, branch, district 
        FROM `tabSahayog Branch` 
        WHERE sol_id LIKE %(text)s 
        OR branch LIKE %(text2)s 
        ORDER BY sol_id ASC, branch ASC 
        LIMIT 20
    """
    
    return frappe.db.sql(sql, {
        "text": f"{text}%",
        "text2": f"%{text}%"
    }, as_dict=True)
