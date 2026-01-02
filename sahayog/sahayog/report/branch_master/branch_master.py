import frappe

def execute(filters=None):
    filters = filters or {}
    search_text = (filters.get("branch_search") or "").strip()

    columns = get_columns()
    
    if not search_text:
        data = [{"branch_name": "Enter SOL ID (e.g. 1005) or Branch Name"}]
        return columns, data

    # === 1. FIND BRANCH (your working logic) ===
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

    # === 2. FETCH ALL BRANCH EMPLOYEES ===
    employees = frappe.get_all(
        "Employee",
        filters={"sahayog_branch": sol_id},
        fields=["employee_name", "designation", "cell_number"],
        order_by="employee_name asc"
    )
    
    # Fallback to sol_id field
    if not employees:
        employees = frappe.get_all(
            "Employee",
            filters={"sol_id": sol_id},
            fields=["employee_name", "designation", "cell_number"],
            order_by="employee_name asc"
        )

    print(f"DEBUG: Branch {branch_doc.branch} (SOL: {sol_id}) - {len(employees)} employees")

    # === 3. ROLE MAPPING ===
    bm_name, bm_contact = "", ""
    bom_name, bom_contact = "", ""
    com_name, com_contact = "", ""
    rom_name, rom_contact = "", ""
    adh_name, adh_contact = "", ""
    rm_name, rm_contact = "", ""
    zm_name, zm_contact = "", ""

    for emp in employees:
        designation = (emp.designation or "").upper()
        
        if "BRANCH MANAGER" in designation:
            bm_name, bm_contact = emp.employee_name, emp.cell_number or ""
        elif "BRANCH OPERATION MANAGER" in designation:
            bom_name, bom_contact = emp.employee_name, emp.cell_number or ""
        elif "CLUSTER OPERATION MANAGER" in designation:
            com_name, com_contact = emp.employee_name, emp.cell_number or ""
        elif "REGIONAL OPERATION MANAGER" in designation or "ASST. ZONAL MANAGER" in designation:
            rom_name, rom_contact = emp.employee_name, emp.cell_number or ""
        elif any(x in designation for x in ["ASST. DISTRICT HEAD", "DISTRICT HEAD", "CLUSTER HEAD"]):
            adh_name, adh_contact = emp.employee_name, emp.cell_number or ""
        elif "REGIONAL MANAGER" in designation:
            rm_name, rm_contact = emp.employee_name, emp.cell_number or ""
        elif "ZONAL MANAGER" in designation:
            zm_name, zm_contact = emp.employee_name, emp.cell_number or ""

    # === 4. SINGLE ROW WITH MAPPED ROLES ===
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
        
        # Role-based columns (exactly as requested)
        "bm_name": bm_name or "",
        "bm_contact": bm_contact or "",
        "bom_name": bom_name or "",
        "bom_contact": bom_contact or "",
        "com_name": com_name or "",
        "com_contact": com_contact or "",
        "rom_name": rom_name or "",
        "rom_contact": rom_contact or "",
        "adh_name": adh_name or "",
        "adh_contact": adh_contact or "",
        "rm_name": rm_name or "",
        "rm_contact": rm_contact or "",
        "zm_name": zm_name or "",
        "zm_contact": zm_contact or ""
    }]

    return columns, data

def get_columns():
    return [
        # Branch Details (left)
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
        
        # Role Mapping Columns (right - exactly as screenshot)
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
