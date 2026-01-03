import frappe

def execute(filters=None):
    filters = filters or {}
    columns = get_columns()
    
    selected_branch_name = filters.get("branch_search") 
    
    # === 1. CLEAN EMPTY STATE ===
    # If no branch is selected, return empty data.
    # The JS 'after_datatable_render' will handle the "Welcome" message.
    if not selected_branch_name:
        return columns, []
    
    # === 2. VALIDATION ===
    if not frappe.db.exists("Sahayog Branch", selected_branch_name):
        # Optional: You can return an empty list here too if you prefer, 
        # but a message in the grid is usually helpful for "Not Found" errors.
        return columns, []

    # === 3. GET DATA (Existing Logic) ===
    branch_doc = frappe.get_doc("Sahayog Branch", selected_branch_name)
    sol_id = branch_doc.sol_id

    employees = frappe.get_all(
        "Employee",
        filters={"sahayog_branch": sol_id},
        fields=["employee_name", "designation", "cell_number"],
        order_by="employee_name asc"
    )

    # ... (Your existing 'roles' bucketing logic remains UNCHANGED) ...
    roles = {
        "BM": [], "BOM": [], "COM": [], "ROM": [], 
        "ADH": [], "RM": [], "ZM": []
    }

    for emp in employees:
        desig = (emp.designation or "").strip().upper()
        person_data = {
            "name": emp.employee_name or "",
            "contact": emp.cell_number or ""
        }

        if desig == "BRANCH MANAGER": roles["BM"].append(person_data)
        elif desig == "BRANCH OPERATION MANAGER": roles["BOM"].append(person_data)
        elif desig == "CLUSTER OPERATION MANAGER": roles["COM"].append(person_data)
        elif desig in ["REGIONAL OPERATION MANAGER", "ASST. ZONAL MANAGER"]: roles["ROM"].append(person_data)
        elif desig in ["ASST. DISTRICT HEAD", "DISTRICT HEAD", "CLUSTER HEAD"]: roles["ADH"].append(person_data)
        elif desig == "REGIONAL MANAGER": roles["RM"].append(person_data)
        elif desig == "ZONAL MANAGER": roles["ZM"].append(person_data)

    counts = [len(v) for v in roles.values()]
    max_rows = max(counts) if counts else 0
    if max_rows == 0: max_rows = 1

    data = []

    for i in range(max_rows):
        row = {
            "branch_name": branch_doc.branch,
            "branch_sol_id": sol_id,
            "state_code": getattr(branch_doc, 'state_code', ''),
            "state": branch_doc.state,
            "district": branch_doc.district,
            "zone": branch_doc.zone,
            "region": branch_doc.region,
            "branch_address": getattr(branch_doc, 'branch_address', ''),
            "branch_opening_date": branch_doc.branch_opening_date,
            "email": getattr(branch_doc, 'email', ''),
        }

        def get_emp(role_key, index):
            if index < len(roles[role_key]):
                return roles[role_key][index]
            return {"name": "", "contact": ""}

        bm = get_emp("BM", i)
        row["bm_name"] = bm["name"]
        row["bm_contact"] = bm["contact"]

        bom = get_emp("BOM", i)
        row["bom_name"] = bom["name"]
        row["bom_contact"] = bom["contact"]

        com = get_emp("COM", i)
        row["com_name"] = com["name"]
        row["com_contact"] = com["contact"]

        rom = get_emp("ROM", i)
        row["rom_name"] = rom["name"]
        row["rom_contact"] = rom["contact"]

        adh = get_emp("ADH", i)
        row["adh_name"] = adh["name"]
        row["adh_contact"] = adh["contact"]

        rm = get_emp("RM", i)
        row["rm_name"] = rm["name"]
        row["rm_contact"] = rm["contact"]

        zm = get_emp("ZM", i)
        row["zm_name"] = zm["name"]
        row["zm_contact"] = zm["contact"]

        data.append(row)

    return columns, data

# ... (Keep get_columns and search_branch_sol exactly as they were) ...
def get_columns():
    return [
        {"label": "Branch Name", "fieldname": "branch_name", "fieldtype": "Data", "width": 200},
        {"label": "SOL ID", "fieldname": "branch_sol_id", "fieldtype": "Int", "width": 80},
        {"label": "State Code", "fieldname": "state_code", "fieldtype": "Data", "width": 70},
        {"label": "State", "fieldname": "state", "fieldtype": "Data", "width": 90},
        {"label": "District", "fieldname": "district", "fieldtype": "Data", "width": 100},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 70},
        {"label": "Region", "fieldname": "region", "fieldtype": "Data", "width": 80},
        {"label": "Address", "fieldname": "branch_address", "fieldtype": "Data", "width": 180},
        {"label": "Open Date", "fieldname": "branch_opening_date", "fieldtype": "Date", "width": 90},
        {"label": "Email", "fieldname": "email", "fieldtype": "Data", "width": 140},
        {"label": "BM Name", "fieldname": "bm_name", "fieldtype": "Data", "width": 150},
        {"label": "BM Contact", "fieldname": "bm_contact", "fieldtype": "Data", "width": 110},
        {"label": "BOM Name", "fieldname": "bom_name", "fieldtype": "Data", "width": 150},
        {"label": "BOM Contact", "fieldname": "bom_contact", "fieldtype": "Data", "width": 110},
        {"label": "COM Name", "fieldname": "com_name", "fieldtype": "Data", "width": 150},
        {"label": "COM Contact", "fieldname": "com_contact", "fieldtype": "Data", "width": 110},
        {"label": "ROM/AZOM Name", "fieldname": "rom_name", "fieldtype": "Data", "width": 150},
        {"label": "ROM/AZOM Contact", "fieldname": "rom_contact", "fieldtype": "Data", "width": 110},
        {"label": "ADH/DH/CH Name", "fieldname": "adh_name", "fieldtype": "Data", "width": 150},
        {"label": "ADH/DH/CH Contact", "fieldname": "adh_contact", "fieldtype": "Data", "width": 110},
        {"label": "RM Name", "fieldname": "rm_name", "fieldtype": "Data", "width": 150},
        {"label": "RM Contact", "fieldname": "rm_contact", "fieldtype": "Data", "width": 110},
        {"label": "ZM Name", "fieldname": "zm_name", "fieldtype": "Data", "width": 150},
        {"label": "ZM Contact", "fieldname": "zm_contact", "fieldtype": "Data", "width": 110}
    ]

@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def search_branch_sol(doctype, txt, searchfield, start, page_len, filters):
    # Same search logic
    conditions = []
    values = {}
    if txt:
        conditions.append("(branch LIKE %(txt)s OR CAST(sol_id AS CHAR) LIKE %(txt)s)")
        values["txt"] = f"%{txt}%"
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"

    data = frappe.db.sql(f"""
        SELECT name, branch, sol_id FROM `tabSahayog Branch` 
        WHERE {where_clause} ORDER BY branch ASC LIMIT %(page_len)s OFFSET %(start)s
    """, {'page_len': page_len, 'start': start, **values}, as_dict=True)

    return [[d.name, f"{d.branch} (SOL: {d.sol_id})"] for d in data]
