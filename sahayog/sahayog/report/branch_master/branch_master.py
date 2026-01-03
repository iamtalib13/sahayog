import frappe

def execute(filters=None):
    filters = filters or {}
    search_text = (filters.get("branch_search") or "").strip()

    columns = get_columns()
    
    if not search_text:
        data = [{"branch_name": "Enter SOL ID (e.g. 1005) or Branch Name"}]
        return columns, data

    # === 1. FIND BRANCH ===
    sol_id_candidate = search_text.split(" - ")[0].strip()
    branch_doc = None
    
    if sol_id_candidate.isdigit():
        branch_name = frappe.db.get_value("Sahayog Branch", {"sol_id": int(sol_id_candidate)}, "name")
        branch_doc = frappe.get_doc("Sahayog Branch", branch_name) if branch_name else None
    
    if not branch_doc:
        branch_name = frappe.db.get_value("Sahayog Branch", {"branch": ["like", f"%{search_text}%"]}, "name")
        branch_doc = frappe.get_doc("Sahayog Branch", branch_name) if branch_name else None

    if not branch_doc:
        data = [{"branch_name": f"No branch found: '{search_text}'"}]
        return columns, data

    sol_id = branch_doc.sol_id

    # === 2. FETCH EMPLOYEES (Strict Filter) ===
    employees = frappe.get_all(
        "Employee",
        filters={"sahayog_branch": sol_id},
        fields=["employee_name", "designation", "cell_number"],
        order_by="employee_name asc"
    )

    print(f"DEBUG: Branch {branch_doc.branch} (SOL: {sol_id}) - {len(employees)} employees")

    # === 3. ROLE MAPPING (Case-Insensitive & Precise) ===
    bm_name, bm_contact = "", ""
    bom_name, bom_contact = "", ""
    com_name, com_contact = "", ""
    rom_name, rom_contact = "", ""
    adh_name, adh_contact = "", ""
    rm_name, rm_contact = "", ""
    zm_name, zm_contact = "", ""

    for emp in employees:
        # 1. HANDLE NULLS: (emp.designation or "") handles None/Null values
        # 2. STRIP WHITESPACE: .strip() removes accidental spaces like "Branch Manager "
        # 3. CASE INSENSITIVITY: .upper() converts "Branch Manager" -> "BRANCH MANAGER"
        designation = (emp.designation or "").strip().upper()
        
        # EXACT MATCHING (using == prevents partial match bugs)
        if designation == "BRANCH MANAGER":
            bm_name, bm_contact = emp.employee_name, emp.cell_number or ""
            
        elif designation == "BRANCH OPERATION MANAGER":
            bom_name, bom_contact = emp.employee_name, emp.cell_number or ""
            
        elif designation == "CLUSTER OPERATION MANAGER":
            com_name, com_contact = emp.employee_name, emp.cell_number or ""
            
        # List checks (All items in list MUST be UPPERCASE for match to work)
        elif designation in ["REGIONAL OPERATION MANAGER", "ASST. ZONAL MANAGER"]:
            rom_name, rom_contact = emp.employee_name, emp.cell_number or ""
            
        elif designation in ["ASST. DISTRICT HEAD", "DISTRICT HEAD", "CLUSTER HEAD"]:
            adh_name, adh_contact = emp.employee_name, emp.cell_number or ""
            
        elif designation == "REGIONAL MANAGER":
            rm_name, rm_contact = emp.employee_name, emp.cell_number or ""
            
        elif designation == "ZONAL MANAGER":
            zm_name, zm_contact = emp.employee_name, emp.cell_number or ""

    # === 4. DATA ROW ===
    data = [{
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
        
        "bm_name": bm_name,
        "bm_contact": bm_contact,
        "bom_name": bom_name,
        "bom_contact": bom_contact,
        "com_name": com_name,
        "com_contact": com_contact,
        "rom_name": rom_name,
        "rom_contact": rom_contact,
        "adh_name": adh_name,
        "adh_contact": adh_contact,
        "rm_name": rm_name,
        "rm_contact": rm_contact,
        "zm_name": zm_name,
        "zm_contact": zm_contact
    }]

    return columns, data

def get_columns():
    return [
        {"label": "Branch Name", "fieldname": "branch_name", "fieldtype": "Data", "width": 180},
        {"label": "SOL ID", "fieldname": "branch_sol_id", "fieldtype": "Int", "width": 70},
        {"label": "State Code", "fieldname": "state_code", "fieldtype": "Data", "width": 70},
        {"label": "State", "fieldname": "state", "fieldtype": "Data", "width": 90},
        {"label": "District", "fieldname": "district", "fieldtype": "Data", "width": 100},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 70},
        {"label": "Region", "fieldname": "region", "fieldtype": "Data", "width": 80},
        {"label": "Address", "fieldname": "branch_address", "fieldtype": "Data", "width": 180},
        {"label": "Open Date", "fieldname": "branch_opening_date", "fieldtype": "Date", "width": 90},
        {"label": "Email", "fieldname": "email", "fieldtype": "Data", "width": 140},
        
        {"label": "BM Name", "fieldname": "bm_name", "fieldtype": "Data", "width": 120},
        {"label": "BM Contact", "fieldname": "bm_contact", "fieldtype": "Data", "width": 110},
        {"label": "BOM Name", "fieldname": "bom_name", "fieldtype": "Data", "width": 120},
        {"label": "BOM Contact", "fieldname": "bom_contact", "fieldtype": "Data", "width": 110},
        {"label": "COM Name", "fieldname": "com_name", "fieldtype": "Data", "width": 120},
        {"label": "COM Contact", "fieldname": "com_contact", "fieldtype": "Data", "width": 110},
        {"label": "ROM/AZOM Name", "fieldname": "rom_name", "fieldtype": "Data", "width": 130},
        {"label": "ROM/AZOM Contact", "fieldname": "rom_contact", "fieldtype": "Data", "width": 120},
        {"label": "ADH/DH/CH Name", "fieldname": "adh_name", "fieldtype": "Data", "width": 130},
        {"label": "ADH/DH/CH Contact", "fieldname": "adh_contact", "fieldtype": "Data", "width": 120},
        {"label": "RM Name", "fieldname": "rm_name", "fieldtype": "Data", "width": 100},
        {"label": "RM Contact", "fieldname": "rm_contact", "fieldtype": "Data", "width": 110},
        {"label": "ZM Name", "fieldname": "zm_name", "fieldtype": "Data", "width": 100},
        {"label": "ZM Contact", "fieldname": "zm_contact", "fieldtype": "Data", "width": 110}
    ]
