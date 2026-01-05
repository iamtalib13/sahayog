import frappe

def execute(filters=None):
    filters = filters or {}
    columns = get_columns()
    
    selected_branch_name = filters.get("branch_search") 
    
    # === 1. HANDLE EMPTY STATE ===
    if not selected_branch_name:
        return columns, []
    
    if not frappe.db.exists("Sahayog Branch", selected_branch_name):
        return columns, []

    # === 2. FETCH BRANCH CONTEXT ===
    # We need the full hierarchy of the selected branch
    branch_doc = frappe.get_doc("Sahayog Branch", selected_branch_name)
    
    # Extract values for filtering
    params = {
        "sol_id": branch_doc.sol_id,
        "district": branch_doc.district,
        "region": branch_doc.region,
        "zone": branch_doc.zone
    }

    # === 3. ROBUST SQL QUERY ===
    # This query uses OR logic with strict AND conditions within each group
    query = """
        SELECT employee_name, designation, cell_number
        FROM `tabEmployee`
        WHERE status = 'Active' AND (
            
            -- LEVEL 1: Direct Branch Match (BM, BOM, etc.)
            sahayog_branch = %(sol_id)s
            
            -- LEVEL 2: District Hierarchy (Strict: District + Region + Zone)
            -- Matches: COM, Cluster Head, ADH, District Head
            OR (
                custom_district = %(district)s 
                AND custom_region = %(region)s 
                AND custom_zone = %(zone)s
                AND designation IN (
                    'CLUSTER OPERATION MANAGER', 
                    'CLUSTER HEAD', 
                    'ASST. DISTRICT HEAD', 
                    'DISTRICT HEAD'
                )
            )
            
            -- LEVEL 3: Region Hierarchy (Strict: Region + Zone)
            -- Matches: ROM, RM
            OR (
                custom_region = %(region)s 
                AND custom_zone = %(zone)s
                AND designation IN (
                    'REGIONAL OPERATION MANAGER', 
                    'REGIONAL MANAGER'
                )
            )
            
            -- LEVEL 4: Zone Hierarchy (Strict: Zone)
            -- Matches: ZM, AZM
            OR (
                custom_zone = %(zone)s 
                AND designation IN (
                    'ZONAL MANAGER', 
                    'ASST. ZONAL MANAGER'
                )
            )
        )
        ORDER BY 
            CASE 
                WHEN designation = 'BRANCH MANAGER' THEN 1
                WHEN designation = 'BRANCH OPERATION MANAGER' THEN 2
                ELSE 3 
            END,
            employee_name ASC
    """
    
    employees = frappe.db.sql(query, params, as_dict=True)

    # === 4. BUCKETING & MAPPING ===
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

        # --- MAPPING RULES ---
        
        if desig == "BRANCH MANAGER": 
            roles["BM"].append(person_data)
            
        elif desig == "BRANCH OPERATION MANAGER": 
            roles["BOM"].append(person_data)
            
        elif desig in ["CLUSTER OPERATION MANAGER", "CLUSTER HEAD"]: 
            roles["COM"].append(person_data)
            
        elif desig in ["ASST. DISTRICT HEAD", "DISTRICT HEAD"]: 
            roles["ADH"].append(person_data) # Mapped to ADH column for clarity
            
        elif desig in ["REGIONAL OPERATION MANAGER", "ASST. ZONAL MANAGER"]: 
            roles["ROM"].append(person_data) # AZM often grouped with ROMs
            
        elif desig == "REGIONAL MANAGER": 
            roles["RM"].append(person_data)
            
        elif desig == "ZONAL MANAGER": 
            roles["ZM"].append(person_data)

    # === 5. FLATTEN TO ROWS ===
    counts = [len(v) for v in roles.values()]
    max_rows = max(counts) if counts else 0
    if max_rows == 0: max_rows = 1

    data = []

    for i in range(max_rows):
        # Base row with branch details
        row = {
            "branch_name": branch_doc.branch,
            "branch_sol_id": branch_doc.sol_id,
            "state_code": getattr(branch_doc, 'state_code', ''),
            "state": branch_doc.state,
            "district": branch_doc.district,
            "zone": branch_doc.zone,
            "region": branch_doc.region,
            "branch_address": getattr(branch_doc, 'branch_address', ''),
            "branch_opening_date": branch_doc.branch_opening_date,
            "email": getattr(branch_doc, 'email', ''),
        }

        # Helper to fetch employee at index i safely
        def get_emp(role_key):
            if i < len(roles[role_key]):
                return roles[role_key][i]
            return {"name": "", "contact": ""}

        # Populate Employee Columns
        bm = get_emp("BM")
        row["bm_name"], row["bm_contact"] = bm["name"], bm["contact"]

        bom = get_emp("BOM")
        row["bom_name"], row["bom_contact"] = bom["name"], bom["contact"]

        com = get_emp("COM")
        row["com_name"], row["com_contact"] = com["name"], com["contact"]

        rom = get_emp("ROM")
        row["rom_name"], row["rom_contact"] = rom["name"], rom["contact"]

        adh = get_emp("ADH")
        row["adh_name"], row["adh_contact"] = adh["name"], adh["contact"]

        rm = get_emp("RM")
        row["rm_name"], row["rm_contact"] = rm["name"], rm["contact"]

        zm = get_emp("ZM")
        row["zm_name"], row["zm_contact"] = zm["name"], zm["contact"]

        data.append(row)

    return columns, data

def get_columns():
    return [
        {"label": "Branch Name", "fieldname": "branch_name", "fieldtype": "Data", "width": 180},
        {"label": "SOL ID", "fieldname": "branch_sol_id", "fieldtype": "Int", "width": 80},
        {"label": "State Code", "fieldname": "state_code", "fieldtype": "Data", "width": 90},
        {"label": "State", "fieldname": "state", "fieldtype": "Data", "width": 135},
        {"label": "District", "fieldname": "district", "fieldtype": "Data", "width": 120},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 100},
        {"label": "Region", "fieldname": "region", "fieldtype": "Data", "width": 100},
        {"label": "Address", "fieldname": "branch_address", "fieldtype": "Data", "width": 350},
        {"label": "Open Date", "fieldname": "branch_opening_date", "fieldtype": "Date", "width": 100},
        {"label": "Email", "fieldname": "email", "fieldtype": "Data", "width": 160},
        {"label": "BM Name", "fieldname": "bm_name", "fieldtype": "Data", "width": 160},
        {"label": "BM Contact", "fieldname": "bm_contact", "fieldtype": "Data", "width": 120},
        {"label": "BOM Name", "fieldname": "bom_name", "fieldtype": "Data", "width": 160},
        {"label": "BOM Contact", "fieldname": "bom_contact", "fieldtype": "Data", "width": 120},
        {"label": "COM Name", "fieldname": "com_name", "fieldtype": "Data", "width": 160},
        {"label": "COM Contact", "fieldname": "com_contact", "fieldtype": "Data", "width": 120},
        {"label": "ROM Name", "fieldname": "rom_name", "fieldtype": "Data", "width": 160},
        {"label": "ROM Contact", "fieldname": "rom_contact", "fieldtype": "Data", "width": 120},
        {"label": "ADH Name", "fieldname": "adh_name", "fieldtype": "Data", "width": 160},
        {"label": "ADH Contact", "fieldname": "adh_contact", "fieldtype": "Data", "width": 120},
        {"label": "RM Name", "fieldname": "rm_name", "fieldtype": "Data", "width": 160},
        {"label": "RM Contact", "fieldname": "rm_contact", "fieldtype": "Data", "width": 120},
        {"label": "ZM Name", "fieldname": "zm_name", "fieldtype": "Data", "width": 160},
        {"label": "ZM Contact", "fieldname": "zm_contact", "fieldtype": "Data", "width": 120}
    ]

@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def search_branch_sol(doctype, txt, searchfield, start, page_len, filters):
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
