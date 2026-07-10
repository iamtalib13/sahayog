import frappe
from frappe import _
from erpnext.stock.report.stock_balance.stock_balance import execute

# sahayog/procurement/api/stock_balance_ledger.get_stock_balance_data
@frappe.whitelist(allow_guest=True)
def get_stock_balance_data(company=None, from_date=None, to_date=None, item_code=None, warehouse=None):

    """
    API to fetch Stock Balance Report records using Frappe's own report logic
    """

    # Convert to frappe._dict
    filters = frappe._dict({
        "company": company or frappe.defaults.get_user_default("Company"),
        "from_date": from_date or frappe.utils.add_days(frappe.utils.today(), -30),
        "to_date": to_date or frappe.utils.today()
    })

    if item_code:
        filters["item_code"] = item_code
    if warehouse:
        filters["warehouse"] = warehouse

    try:
        _, data = execute(filters)
        return {
            "status": "success",
            "total_records": len(data),
            "data": data
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Stock Balance API Error")
        return {
            "status": "error",
            "message": str(e)
        }


# api:/api/method/sahayog.procurement.api.stock_balance_ledger.get_asset_combine_data
@frappe.whitelist(allow_guest=True)
def get_asset_combine_data(asset_name=None, asset_category=None, status=None, item_code=None, location=None,
                       asset=None, movement_type=None, from_date=None, to_date=None):
    """
    Combined API:
    Assets WITHOUT movement -> shown in asset list
    Assets WITH movement:
        - If latest movement.source_location is NULL -> show asset
        - If latest movement.source_location NOT NULL -> hide asset
    """

    # ======================================================
    # 1. ASSET LIST SECTION
    # ======================================================
    asset_filters = {}

    if asset_name:
        asset_filters["asset_name"] = ["like", f"%{asset_name}%"]

    if asset_category:
        asset_filters["asset_category"] = asset_category

    if status:
        asset_filters["status"] = status

    if item_code:
        asset_filters["item_code"] = item_code

    if location:
        asset_filters["location"] = location

    all_assets = frappe.get_all(
        "Asset",
        filters=asset_filters,
        fields=[
            "name",
            "asset_name",
            "item_name",
            "item_code",
            "asset_category",
            "location",
            "custodian",
            "status",
        ],
        order_by="modified desc"
    )

    # ======================================================
    # 2. ASSET MOVEMENT SECTION
    # ======================================================
    movement_filters = {}

    if movement_type:
        movement_filters["purpose"] = movement_type

    if from_date and to_date:
        movement_filters["transaction_date"] = ["between", [from_date, to_date]]
    elif from_date:
        movement_filters["transaction_date"] = [">=", from_date]
    elif to_date:
        movement_filters["transaction_date"] = ["<=", to_date]

    parent_records = frappe.get_all(
        "Asset Movement",
        filters=movement_filters,
        fields=[
            "name",
            "company",
            "purpose",
            "transaction_date",
            "reference_doctype",
            "reference_name",
            "modified"
        ],
        order_by="transaction_date desc"
    )

    movement_data = []

    for mv in parent_records:
        child_filters = {"parent": mv.name}
        if asset:
            child_filters["asset"] = asset

        children = frappe.get_all(
            "Asset Movement Item",
            filters=child_filters,
            fields=[
                "asset",
                "asset_name",
                "source_location",
                "target_location",
                "from_employee",
                "to_employee"
            ]
        )

        for c in children:
            movement_data.append({
                "movement_id": mv.name,
                "company": mv.company,
                "purpose": mv.purpose,
                "transaction_date": mv.transaction_date,
                "reference_doctype": mv.reference_doctype,
                "reference_name": mv.reference_name,
                "modified": mv.modified,

                # child data
                "asset": c.asset,
                "asset_name": c.asset_name,
                "source_location": c.source_location,
                "target_location": c.target_location,
                "from_employee": c.from_employee,
                "to_employee": c.to_employee
            })

    # ======================================================
    # 3. NEW FILTER LOGIC FOR ASSETS
    # ======================================================

    # Build dictionary: latest movement per asset
    latest_movement = {}

    for row in movement_data:
        asset_id = row["asset"]

        # First occurrence OR newer date? then update
        if asset_id not in latest_movement or \
           row["transaction_date"] > latest_movement[asset_id]["transaction_date"]:
            latest_movement[asset_id] = row

    # Apply new business rule
    filtered_assets = []

    for a in all_assets:

        # CASE 1: asset has no movement → keep it
        if a.name not in latest_movement:
            filtered_assets.append(a)
            continue

        # CASE 2: has movement → check latest record
        mv = latest_movement[a.name]

        # RULE:
        # If latest movement has source_location = NULL → KEEP
        # Else → hide (do not append)
        if mv.get("source_location") is None:
            filtered_assets.append(a)

    # ======================================================
    # 4. FINAL RESPONSE
    # ======================================================
    return {
        "status": "success",
        "asset_count": len(filtered_assets),
        "assets": filtered_assets,

        "movement_count": len(movement_data),
        "movements": movement_data
    }



@frappe.whitelist()
def ensure_locations_exist(locations):
    if isinstance(locations, str):
        locations = frappe.parse_json(locations)
    
    for loc in locations:
        if not loc:
            continue
            
        loc = str(loc).strip()
        if not frappe.db.exists("Location", loc):
            try:
                # Create Location with SOL ID as both name and location_name
                loc_doc = frappe.new_doc("Location")
                loc_doc.name = loc
                loc_doc.location_name = loc
                loc_doc.is_group = 0
                loc_doc.insert(ignore_permissions=True)
                frappe.db.commit()
                print(f"Created missing location: {loc}")
            except Exception:
                # Fallback
                try:
                    frappe.db.sql("""INSERT INTO `tabLocation` (name, location_name, is_group, docstatus) 
                                  VALUES (%s, %s, 0, 0)""", (loc, loc))
                    frappe.db.commit()
                except Exception:
                    pass

@frappe.whitelist()
def create_asset_movement_from_emmr(emmr, assets):
    if not assets:
        frappe.throw(_("No assets selected"))

    assets = frappe.parse_json(assets)
    emmr_doc = frappe.get_doc("Employee Material Request", emmr)

    # -------------------------------------------------
    # Prevent duplicate Asset Movement
    # -------------------------------------------------
    existing = frappe.db.exists(
        "Asset Movement",
        {
            "custom_reference_doctype": "Employee Material Request",
            "custom_reference_name": emmr_doc.name,
            "docstatus": ["!=", 2],
        }
    )

    # if existing:
    #     frappe.throw(_("Asset Movement already exists for this request"))

    # -------------------------------------------------
    # Create Asset Movement
    # -------------------------------------------------
    am = frappe.new_doc("Asset Movement")
    am.company = emmr_doc.company
    am.transaction_date = date.today().strftime("%Y-%m-%d")
    am.purpose = "Issue"
    am.custom_reference_doctype = "Employee Material Request"
    am.custom_reference_name = emmr_doc.name

# Child table (MANDATORY employee)
    for row in assets:
        source_loc = row.get("location")
        from_emp = row.get("custodian")
        to_emp = row.get("employee")
        target_loc = row.get("target_location") or emmr_doc.target_location

        print(target_loc)

        # 1. Clean Asset: Clear composite flag and prepare for movement
        asset_name = row["asset"]
        frappe.db.sql("""UPDATE `tabAsset` SET is_composite_asset=0, booked_fixed_asset=1 WHERE name=%s""", asset_name)

        am.append(
            "assets", {
                "asset": asset_name,
                "source_location": source_loc,
                "target_location": target_loc,
                "from_employee": from_emp,
                "to_employee": to_emp,
            })
    am.insert(ignore_permissions=True)
    am.submit()

    # 2. FINAL FORCE UPDATE: Override all standard status logic
    for row in assets:
        source_loc = row.get("location")
        from_emp = row.get("custodian")
        
        # Determine target values
        if not source_loc and not from_emp:
            t_state, t_status = "Available", "Available"
        else:
            t_state, t_status = "Assign", "Issue"

        # Force docstatus=1 to ensure get_status() does not return Work In Progress/Draft
        # Force is_composite_asset=0 to bypass capitalization logic
        frappe.db.sql("""UPDATE `tabAsset` 
                      SET workflow_state=%s, status=%s, docstatus=1, is_composite_asset=0 
                      WHERE name=%s""", (t_state, t_status, row["asset"]))
    
    frappe.db.commit()
    am.submit()

    # 2. FINAL Force Sync: Set Available/Available or Assign/Issue
    for row in assets:
        source_loc = row.get("location")
        from_emp = row.get("custodian")
        to_emp = row.get("employee")

        # 1. Clean Asset: Clear composite flag and prepare for movement
        asset_name = row["asset"]
        frappe.db.sql("""UPDATE `tabAsset` SET is_composite_asset=0, booked_fixed_asset=1 WHERE name=%s""", asset_name)

        am.append(
            "assets", {
                "asset": asset_name,
                "source_location": source_loc,
                "from_employee": from_emp,
                "to_employee": to_emp,
            })
    for row in assets:
        source_loc = row.get("location")
        from_emp = row.get("custodian")
        to_emp = row.get("employee")

        # 1. Clean Asset: Clear composite flag and prepare for movement
        asset_name = row["asset"]
        frappe.db.sql("""UPDATE `tabAsset` SET is_composite_asset=0, booked_fixed_asset=1 WHERE name=%s""", asset_name)

        am.append(
            "assets", {
                "asset": asset_name,
                "source_location": source_loc,
                "from_employee": from_emp,
                "to_employee": to_emp,
            })
    for row in assets:
        source_loc = row.get("location")
        from_emp = row.get("custodian")
        to_emp = row.get("employee")

        # 1. Clean Asset: Clear composite flag and prepare for movement
        asset_name = row["asset"]
        frappe.db.sql("""UPDATE `tabAsset` SET is_composite_asset=0, booked_fixed_asset=1 WHERE name=%s""", asset_name)

        am.append(
            "assets", {
                "asset": asset_name,
                "source_location": source_loc,
                "from_employee": from_emp,
                "to_employee": to_emp,
            })
    return am.name

@frappe.whitelist()
def get_emr_list(limit=20, start=0, search_text=None, status=None, department=None, employee=None, start_date=None, end_date=None, request=None):
    from sahayog.permissions import get_employee_material_request_permission
    perm_cond = get_employee_material_request_permission(frappe.session.user)
    
    conditions = []
    if perm_cond:
        conditions.append(perm_cond.replace("`tabEmployee Material Request`", "emr"))
        
    if search_text:
        conditions.append(f"emr.name LIKE '%%{search_text}%%'")
        
    if request:
        conditions.append(f"emr.name = '{request}'")
        
    if status:
        conditions.append(f"emr.status = '{status}'")
        
    if department:
        conditions.append(f"emr.department = '{department}'")
        
    if employee:
        conditions.append(f"emr.employee = '{employee}'")
        
    if start_date:
        conditions.append(f"emr.creation >= '{start_date} 00:00:00'")
        
    if end_date:
        conditions.append(f"emr.creation <= '{end_date} 23:59:59'")
        
    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
    
    query = f"""
        SELECT emr.*, emp.employee_name
        FROM `tabEmployee Material Request` emr
        LEFT JOIN `tabEmployee` emp ON emp.name = emr.employee
        {where_clause}
        ORDER BY emr.creation DESC
        LIMIT {int(limit)} OFFSET {int(start)}
    """
    data = frappe.db.sql(query, as_dict=True)
    
    # Get total count with the same logic
    count_query = f"SELECT COUNT(*) FROM `tabEmployee Material Request` emr {where_clause}"
    total_count = frappe.db.sql(count_query)[0][0]

    for row in data:
        row["items"] = frappe.get_all(
            "Material Request Items",
            filters={"parent": row.name},
            fields=["name", "status", "item_code", "quantity", "item_category", "description"]
        )

    return {"data": data, "total": total_count}

@frappe.whitelist()
def get_asset_list(limit=20, start=0, search_text=None):
    """
    Fetch Assets joined with Employee Name for Custodian
    """
    conditions = []
    values = {}

    if search_text:
        conditions.append("(ast.name LIKE %(search)s OR ast.asset_name LIKE %(search)s OR ast.serial_no LIKE %(search)s OR ast.location LIKE %(search)s OR sb.branch LIKE %(search)s OR emp.employee_name LIKE %(search)s)")
        values["search"] = f"%{search_text}%"

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    # Get total count
    total_count = frappe.db.sql(f"""
        SELECT COUNT(*) 
        FROM `tabAsset` ast
        LEFT JOIN `tabEmployee` emp ON emp.name = ast.custodian
        LEFT JOIN `tabSahayog Branch` sb ON sb.name = ast.location
        {where_clause}
    """, values)[0][0]

    # Get data
    data = frappe.db.sql(f"""
        SELECT 
            ast.*, 
            emp.employee_name as custodian_name,
            sb.branch as location_name
        FROM `tabAsset` ast
        LEFT JOIN `tabEmployee` emp ON emp.name = ast.custodian
        LEFT JOIN `tabSahayog Branch` sb ON sb.name = ast.location
        {where_clause}
        ORDER BY ast.creation DESC
        LIMIT %(limit)s OFFSET %(offset)s
    """, {**values, "limit": int(limit), "offset": int(start)}, as_dict=True)

    return {
        "data": data,
        "total": total_count
    }

@frappe.whitelist()
def get_serial_no_list(limit=20, start=0, search_text=None):
    """
    Fetch Serial Nos with configuration count
    """
    conditions = []
    values = {}

    if search_text:
        conditions.append("(sn.name LIKE %(search)s OR sn.item_code LIKE %(search)s OR sn.serial_no LIKE %(search)s)")
        values["search"] = f"%{search_text}%"

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    total_count = frappe.db.sql(f"SELECT COUNT(*) FROM `tabSerial No` sn {where_clause}", values)[0][0]

    data = frappe.db.sql(f"""
        SELECT
            sn.*,
            (SELECT COUNT(*) FROM `tabSahayog Serial Configuration` WHERE parent = sn.name) as config_count
        FROM `tabSerial No` sn
        {where_clause}
        ORDER BY sn.creation DESC
        LIMIT %(limit)s OFFSET %(offset)s
    """, {**values, "limit": int(limit), "offset": int(start)}, as_dict=True)

    return {
        "data": data,
        "total": total_count
    }

@frappe.whitelist()
def get_serial_no_list(limit=20, start=0, search_text=None):
    """
    Fetch Serial Nos with configuration count
    """
    conditions = []
    values = {}

    if search_text:
        conditions.append("(sn.name LIKE %(search)s OR sn.item_code LIKE %(search)s OR sn.serial_no LIKE %(search)s)")
        values["search"] = f"%{search_text}%"

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    total_count = frappe.db.sql(f"SELECT COUNT(*) FROM `tabSerial No` sn {where_clause}", values)[0][0]

    data = frappe.db.sql(f"""
        SELECT
            sn.*,
            (SELECT COUNT(*) FROM `tabSahayog Serial Configuration` WHERE parent = sn.name) as config_count
        FROM `tabSerial No` sn
        {where_clause}
        ORDER BY sn.creation DESC
        LIMIT %(limit)s OFFSET %(offset)s
    """, {**values, "limit": int(limit), "offset": int(start)}, as_dict=True)

    return {
        "data": data,
        "total": total_count
    }

@frappe.whitelist()
def get_movement_list(limit=20, start=0, search_text=None):
    """
    Fetch Asset Movements joined with first child item fields
    """
    conditions = []
    values = {}

    if search_text:
        conditions.append("(am.name LIKE %(search)s OR am.purpose LIKE %(search)s OR ami.source_location LIKE %(search)s OR ami.to_employee LIKE %(search)s)")
        values["search"] = f"%{search_text}%"

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    # Get total count (using distinct parent because of join)
    total_count = frappe.db.sql("""
        SELECT COUNT(DISTINCT am.name)
        FROM `tabAsset Movement` am
        LEFT JOIN `tabAsset Movement Item` ami ON ami.parent = am.name
        {where_clause}
    """.format(where_clause=where_clause), values)[0][0]

    # Get data - using a subquery to get only the first child row per parent
    data = frappe.db.sql("""
        SELECT
            am.name,
            am.purpose,
            am.transaction_date,
            am.docstatus,
            am.company,
            am.creation,
            ami.source_location,
            ami.to_employee,
            emp.employee_name as custodian_name
        FROM `tabAsset Movement` am
        LEFT JOIN (
            SELECT parent, source_location, to_employee,
                   ROW_NUMBER() OVER (PARTITION BY parent ORDER BY name ASC) as rn
            FROM `tabAsset Movement Item`
        ) ami ON ami.parent = am.name AND ami.rn = 1
        LEFT JOIN `tabEmployee` emp ON emp.name = ami.to_employee
        {where_clause}
        ORDER BY am.creation DESC
        LIMIT %(limit)s OFFSET %(offset)s
    """.format(where_clause=where_clause), {**values, "limit": int(limit), "offset": int(start)}, as_dict=True)

    return {
        "data": data,
        "total": total_count
    }


@frappe.whitelist()
def get_branch_stock(warehouse=None, limit=20, start=0, search_text=None, filter_type=None, item_code=None, warehouse_filter=None):
    """
    API to fetch Branch Stock data (reusing report logic)
    """
    from sahayog.procurement.report.branch_stock.branch_stock import execute

    user = frappe.session.user
    user_warehouse = None

    # 1. Get assigned warehouse from settings
    assigned_warehouse = frappe.db.get_value(
        "Default Warehouse",
        {"parent": "Sahayog Settings", "parenttype": "Sahayog Settings", "user_id": user},
        "warehouse"
    )
    
    # 2. Get sol_id from Employee as fallback
    sol_id = frappe.db.get_value("Employee", {"user_id": user}, "sol_id")

    filters = {}
    if warehouse_filter:
        filters["warehouse"] = warehouse_filter
    elif warehouse:
        filters["warehouse"] = warehouse
    
    if item_code:
        filters["item_code"] = item_code

    _, data = execute(filters)

    # Determine user_warehouse with fallback logic
    if assigned_warehouse:
        # Check if the assigned warehouse exists in the data
        has_match = any(row.get("warehouse") == assigned_warehouse for row in data)
        if has_match:
            user_warehouse = assigned_warehouse
        elif sol_id:
            # Fallback if settings warehouse doesn't match actual data
            user_warehouse = sol_id
    else:
        user_warehouse = sol_id

    # Apply My Stock / Other Stock filtering
    if filter_type == "My Stock" and user_warehouse:
        data = [row for row in data if row.get("warehouse") == user_warehouse]
    elif filter_type == "Other Stock" and user_warehouse:
        data = [row for row in data if row.get("warehouse") != user_warehouse]

    if search_text:
        terms = search_text.lower().split()
        # Fetch all branches for mapping
        branches = frappe.get_all("Sahayog Branch", fields=["name", "branch"])
        branch_map = {b.name: b.branch.lower() for b in branches if b.branch}

        filtered_data = []
        for row in data:
            match_all = True
            for term in terms:
                found_term = (
                    term in str(row.get("item_code", "")).lower() or 
                    term in str(row.get("item_name", "")).lower() or 
                    term in str(row.get("warehouse", "")).lower() or
                    (branch_map.get(row.get("warehouse"), "") and term in branch_map.get(row.get("warehouse", "")))
                )
                if not found_term:
                    match_all = False
                    break
            if match_all:
                filtered_data.append(row)
        data = filtered_data
        
    total_count = len(data)
    
    # Apply manual pagination since execute returns all
    start = int(start)
    limit = int(limit)
    paginated_data = data[start:start+limit]
    
    return {
        "data": paginated_data,
        "total": total_count
    }


@frappe.whitelist()
def get_user_branch_warehouse(user=None):
    """
    Get the warehouse linked to the branch of the specified user or current session user.
    Checks Sahayog Settings first, then falls back to sol_id from Employee
    """
    if not user:
        user = frappe.session.user

    # 1. Check Sahayog Settings (Default Warehouse table)
    try:
        # Fetching directly from the child table for better performance
        assigned_warehouse = frappe.db.get_value(
            "Default Warehouse",
            {"parent": "Sahayog Settings", "parenttype": "Sahayog Settings", "user_id": user},
            "warehouse"
        )
        if assigned_warehouse:
            return {
                "warehouse": assigned_warehouse,
                "branch": assigned_warehouse
            }
    except Exception as e:
        frappe.log_error(f"Error in get_user_branch_warehouse (Sahayog Settings): {str(e)}")

    # 2. Fallback to sol_id from Employee (matches Branch Stock report logic)
    sol_id = frappe.db.get_value("Employee", {"user_id": user}, "sol_id")

    if not sol_id:
        return {"warehouse": None, "branch": None}

    return {
        "warehouse": sol_id,
        "branch": sol_id
    }


@frappe.whitelist()
def get_item_quantities_for_warehouse(warehouse=None):
    """
    Get actual quantity for all items in a specific warehouse (like Branch Stock report)
    Returns dict: {item_code: qty}
    """
    if not warehouse:
        return {}
    
    # Get quantities from Bin - same logic as Branch Stock report
    bins = frappe.db.sql("""
        SELECT item_code, SUM(actual_qty) as qty
        FROM `tabBin`
        WHERE warehouse = %s
        GROUP BY item_code
    """, (warehouse,), as_dict=True)
    
    return {bin.item_code: bin.qty for bin in bins}

@frappe.whitelist()
def create_material_issue(items, warehouse):
    """
    Create and submit a Stock Entry of type 'Material Issue'
    """
    if not items:
        frappe.throw(_("No items provided for Material Issue"))
    if not warehouse:
        frappe.throw(_("No warehouse specified for Material Issue"))

    items = frappe.parse_json(items)
    
    se = frappe.new_doc("Stock Entry")
    se.stock_entry_type = "Material Issue"
    
    # Strictly get company from the specific Warehouse
    company = frappe.db.get_value("Warehouse", warehouse, "company")
    
    if not company:
        # Fallback to user default if warehouse record doesn't specify company
        company = frappe.defaults.get_user_default("Company")
        
    if not company:
        frappe.throw(_("Could not determine Company for Warehouse {0}. Please ensure the Warehouse has a Company assigned.").format(warehouse))
    
    se.company = company
    se.from_warehouse = warehouse
    
    for item in items:
        se.append("items", {
            "item_code": item.get("item_code"),
            "qty": item.get("use_qty"),
            "s_warehouse": warehouse,
            "uom": item.get("stock_uom") or item.get("uom") or frappe.db.get_value("Item", item.get("item_code"), "stock_uom")
        })
    
    se.insert()
    se.submit()
    return se.name

@frappe.whitelist()
def get_user_inventory_type():
    """
    Fetch the inventory_type for the current user from Sahayog Settings (wh_dept_map table).
    This bypasses the need for full permission to the Sahayog Settings DocType.
    """
    user = frappe.session.user
    
    # Get the child table entries from Sahayog Settings
    # Using frappe.get_doc("Sahayog Settings") directly as it's a Single DocType
    try:
        settings = frappe.get_doc("Sahayog Settings")
        for row in settings.wh_dept_map:
            if row.user_id == user:
                return row.inventory_type
    except Exception as e:
        frappe.log_error(f"Error in get_user_inventory_type: {str(e)}")
    
    return None

@frappe.whitelist()
def get_invoice_numbers():
    return [r.custom_invoice_number for r in frappe.get_all('Purchase Receipt', filters={'docstatus': 1, 'custom_invoice_number': ['is', 'set']}, fields=['custom_invoice_number'], distinct=True)]

    """
    Fetch the inventory_type for the current user from Sahayog Settings (wh_dept_map table).
    This bypasses the need for full permission to the Sahayog Settings DocType.
    """
    user = frappe.session.user
    
    # Get the child table entries from Sahayog Settings
    # Using frappe.get_doc("Sahayog Settings") directly as it's a Single DocType
    try:
        settings = frappe.get_doc("Sahayog Settings")
        for row in settings.wh_dept_map:
            if row.user_id == user:
                return row.inventory_type
    except Exception as e:
        frappe.log_error(f"Error in get_user_inventory_type: {str(e)}")
    
    return None

@frappe.whitelist()
def get_wh_dept_map(limit=None, start=None, search_text=None):
    """
    Fetch the wh_dept_map child table from Sahayog Settings.
    """
    if "Administrator" not in frappe.get_roles():
        frappe.throw("Not permitted", frappe.PermissionError)
        
    try:
        # Fetching directly from the child table doctype bypassing Sahayog Settings permissions
        data = frappe.get_all(
            "Default Warehouse",
            filters={"parent": "Sahayog Settings", "parenttype": "Sahayog Settings"},
            fields=["user_id", "warehouse", "inventory_type", "dfault", "name"]
        )
        
        # Apply search_text filtering
        if search_text:
            terms = search_text.lower().split()
            filtered_data = []
            for row in data:
                match_all = True
                for term in terms:
                    found_term = (
                        term in str(row.get("user_id", "")).lower() or 
                        term in str(row.get("warehouse", "")).lower() or 
                        term in str(row.get("inventory_type", "")).lower()
                    )
                    if not found_term:
                        match_all = False
                        break
                if match_all:
                    filtered_data.append(row)
            data = filtered_data
            
        total_count = len(data)
        
        # Apply pagination if limit/start are provided
        if limit is not None and start is not None:
            start = int(start)
            limit = int(limit)
            data = data[start:start+limit]
            
        return {
            "data": data,
            "total": total_count
        }
    except Exception as e:
        frappe.log_error(f"Error in get_wh_dept_map: {str(e)}")
        return {"data": [], "total": 0}

@frappe.whitelist()
def add_wh_dept_entry(user_id, warehouse, inventory_type, dfault=0):
    """
    Add a new entry to the wh_dept_map child table in Sahayog Settings.
    """
    if "Administrator" not in frappe.get_roles():
        frappe.throw("Not permitted", frappe.PermissionError)
        
    try:
        settings = frappe.get_doc("Sahayog Settings")
        settings.append("wh_dept_map", {
            "user_id": user_id,
            "warehouse": warehouse,
            "inventory_type": inventory_type,
            "dfault": dfault
        })
        settings.save(ignore_permissions=True)
        return {"status": "success", "message": "Entry added successfully"}
    except Exception as e:
        frappe.log_error(f"Error in add_wh_dept_entry: {str(e)}")
        frappe.throw(str(e))

@frappe.whitelist()
def update_wh_dept_entry(name, user_id, warehouse, inventory_type, dfault=0):
    """
    Update an existing entry in the wh_dept_map child table.
    """
    if "Administrator" not in frappe.get_roles():
        frappe.throw("Not permitted", frappe.PermissionError)
        
    try:
        settings = frappe.get_doc("Sahayog Settings")
        found = False
        for row in settings.wh_dept_map:
            if row.name == name:
                row.user_id = user_id
                row.warehouse = warehouse
                row.inventory_type = inventory_type
                row.dfault = dfault
                found = True
                break
        
        if not found:
            frappe.throw(f"Entry {name} not found")
            
        settings.save(ignore_permissions=True)
        return {"status": "success", "message": "Entry updated successfully"}
    except Exception as e:
        frappe.log_error(f"Error in update_wh_dept_entry: {str(e)}")
        frappe.throw(str(e))

@frappe.whitelist()
def delete_wh_dept_entry(name):
    """
    Delete an entry from the wh_dept_map child table.
    """
    if "Administrator" not in frappe.get_roles():
        frappe.throw("Not permitted", frappe.PermissionError)
        
    try:
        settings = frappe.get_doc("Sahayog Settings")
        new_map = []
        found = False
        for row in settings.wh_dept_map:
            if row.name == name:
                found = True
                continue
            new_map.append(row)
        
        if not found:
            frappe.throw(f"Entry {name} not found")
            
        settings.wh_dept_map = new_map
        settings.save(ignore_permissions=True)
        return {"status": "success", "message": "Entry deleted successfully"}
    except Exception as e:
        frappe.log_error(f"Error in delete_wh_dept_entry: {str(e)}")
        frappe.throw(str(e))

@frappe.whitelist()
def get_available_stock_batches(item_code, warehouse):
    """
    Returns available stock entries for an item in a warehouse, grouped by valuation rate.
    """
    # Fetching actual rates from both Purchase Receipt and Stock Entry
    stock_entries = frappe.db.sql(f"""
        SELECT rate, SUM(qty) as qty FROM (
            SELECT pri.valuation_rate as rate, SUM(pri.qty) as qty
            FROM `tabPurchase Receipt Item` pri
            JOIN `tabPurchase Receipt` pr ON pr.name = pri.parent
            WHERE pri.item_code = %(item_code)s AND pri.warehouse = %(warehouse)s AND pr.docstatus = 1
            GROUP BY pri.valuation_rate

            UNION ALL

            SELECT sei.valuation_rate as rate, SUM(sei.qty) as qty
            FROM `tabStock Entry Detail` sei
            JOIN `tabStock Entry` se ON se.name = sei.parent
            WHERE sei.item_code = %(item_code)s AND (sei.t_warehouse = %(warehouse)s) AND se.docstatus = 1
            GROUP BY sei.valuation_rate
        ) as combined_stock
        GROUP BY rate
        HAVING SUM(qty) > 0
    """, {"item_code": item_code, "warehouse": warehouse}, as_dict=True)
    
    return stock_entries

@frappe.whitelist()
def get_warehouse_company(warehouse):
    """
    Returns the company linked to a specific warehouse.
    """
    if not warehouse:
        return None
    return frappe.db.get_value("Warehouse", warehouse, "company")

@frappe.whitelist()
def create_warehouse_if_not_exists(branch_id):
    """
    Check if a warehouse exists for the given branch ID.
    If not, create it with branch_id as name and category 'Branch'.
    """
    # Check if a warehouse already exists with this name (branch_id)
    existing = frappe.db.get_value("Warehouse", {"name": branch_id}, "name")
    if existing:
        return existing

    # Get branch details
    branch_doc = frappe.get_doc("Sahayog Branch", branch_id)
    
    # Create the warehouse
    new_wh = frappe.get_doc({
        "doctype": "Warehouse",
        "warehouse_name": branch_id,
        "custom_warehouse_category": "Branch", 
        "is_group": 0,
        "company": frappe.defaults.get_global_default("company") or frappe.get_all("Company")[0].name
    })
    new_wh.insert(ignore_permissions=True)
    return new_wh.name

@frappe.whitelist()
def get_invoice_by_serial_no(serial_no):
    if not serial_no:
        return ""
    
    # 1. Get the bundle that contains this serial no
    bundle = frappe.db.get_value("Serial and Batch Entry", {"serial_no": serial_no}, "parent")
    if not bundle:
        return ""
        
    # 2. Get the Purchase Receipt linked to this bundle
    pr_name = frappe.db.get_value("Purchase Receipt Item", {"serial_and_batch_bundle": bundle}, "parent")
    if not pr_name:
        return ""
        
    # 3. Get the invoice number from the PR
    invoice_number = frappe.db.get_value("Purchase Receipt", pr_name, "custom_invoice_number")
    
    return invoice_number or ""

@frappe.whitelist()
def get_item_rates_from_invoice(invoice_number):
    if not invoice_number:
        return {}
    
    # Get all PRs with this invoice
    prs = frappe.get_all("Purchase Receipt", filters={"custom_invoice_number": invoice_number, "docstatus": 1}, pluck="name")
    if not prs:
        return {}
        
    # Get rates from items
    items = frappe.get_all("Purchase Receipt Item", 
                           filters={"parent": ["in", prs]}, 
                           fields=["item_code", "net_rate"])
    
    # Map item_code to rate (taking the last found rate if multiple PRs)
    rates = {i.item_code: i.net_rate for i in items}
    return rates

@frappe.whitelist()
def get_serial_nos_by_invoice(invoice_number):
    if not invoice_number:
        return []
    
    # 1. Get all Purchase Receipts with this invoice number
    prs = frappe.get_all("Purchase Receipt", filters={"custom_invoice_number": invoice_number, "docstatus": 1}, pluck="name")
    if not prs:
        return []
        
    # 2. Get all Serial and Batch Bundles linked to these PRs
    bundles = frappe.get_all("Purchase Receipt Item", filters={"parent": ["in", prs], "serial_and_batch_bundle": ["is", "set"]}, pluck="serial_and_batch_bundle")
    if not bundles:
        return []
        
    # 3. Get all Serial Nos in these bundles
    serial_nos = frappe.get_all("Serial and Batch Entry", filters={"parent": ["in", bundles]}, pluck="serial_no")
    
    return list(set(serial_nos))

@frappe.whitelist()
def get_portal_master_data():
    """
    Unified API to fetch all master data for the portal in one request.
    This bypasses standard permissions for portal users while remaining secure.
    """
    # Handle potential missing DocType for HSN codes
    hsn_codes = []
    try:
        hsn_codes = frappe.get_all("GST HSN Code", fields=["name", "description"])
    except frappe.db.TableMissingError:
        try:
            hsn_codes = frappe.get_all("HSN Code", fields=["name", "description"])
        except Exception:
            pass
    except Exception:
        pass

    # Fetch available Serial Nos (not linked to any Asset)
    # Note: Using the logic from get_available_serial_nos
    used_serial_nos = frappe.get_all("Asset", fields=["serial_no"], pluck="serial_no")
    used_serial_nos = list(set([s for s in used_serial_nos if s]))
    
    serial_no_filters = {}
    if used_serial_nos:
        serial_no_filters = {"name": ["not in", used_serial_nos]}
    
    available_serial_nos = frappe.get_all("Serial No", filters=serial_no_filters, fields=["name", "item_code"])

    return {
        "employees": frappe.get_all("Employee", fields=["name", "employee_name", "user_id", "employee_number", "designation", "department", "branch", "cell_number", "company_email", "custom_division"]),
        "warehouses": [w.name for w in frappe.get_all("Warehouse", filters={"disabled": 0})],
        "sahayog_branches": frappe.get_all("Sahayog Branch", fields=["name", "branch", "sol_id"]),
        "wh_dept_map": frappe.get_all("Default Warehouse", filters={"parent": "Sahayog Settings", "parenttype": "Sahayog Settings"}, fields=["inventory_type", "warehouse", "dfault", "user_id"]),
        "emr_names": [r.name for r in frappe.get_all("Employee Material Request", order_by="creation desc", limit=500)],
        "purchase_receipt_names": [r.name for r in frappe.get_all("Purchase Receipt", order_by="creation desc", limit=500)],
        "suppliers": frappe.get_all("Supplier", fields=["name", "supplier_name"], filters={"disabled": 0}),
        "items": frappe.get_all("Item", fields=["name", "item_name", "stock_uom", "is_fixed_asset", "is_stock_item", "custom_item_department", "description"], filters={"disabled": 0}),
        "assets_list": frappe.get_all("Asset", fields=["name", "asset_name", "item_code", "item_name", "location", "custodian", "brand", "serial_no"], filters={"docstatus": 1}),
        "item_groups": [g.name for g in frappe.get_all("Item Group")],
        "item_departments": [d.name for d in frappe.get_all("Item Department")],
        "uoms": [u.name for u in frappe.get_all("UOM")],
        "asset_categories": [c.name for c in frappe.get_all("Asset Category")],
        "locations": [l.name for l in frappe.get_all("Location")],
        "zones": [z.name for z in frappe.get_all("Zone")],
        "divisions": [d.name for d in frappe.get_all("Division")],
        "brands": [b.name for b in frappe.get_all("Brand")],
        "states": [s for s in frappe.get_meta("Asset").get_field("state").options.split("\n") if s],
        "hsn_codes": hsn_codes,
        "serial_nos": available_serial_nos,
    }

@frappe.whitelist()
def skip_approval_stage(docname, stage):
    """
    Skip a specific approval stage (Reporting or HO Officer) by bypassing workflow.
    Allowed for Administrators and the Record Owner.
    """
    doc = frappe.get_doc("Employee Material Request", docname)
    
    # Check if user is in wh_dept_map
    is_warehouse_user = frappe.db.exists("Default Warehouse", {"parent": "Sahayog Settings", "parenttype": "Sahayog Settings", "user_id": frappe.session.user})
    
    if "Administrator" not in frappe.get_roles() and doc.owner != frappe.session.user and not is_warehouse_user:
        frappe.throw(_("Not permitted"), frappe.PermissionError)
    
    update_fields = {}
    
    if stage == "Reporting":
        update_fields["reporting_person_status"] = "Skip"
        update_fields["status"] = "Pending HO Approval"
    elif stage == "HO Approval":
        update_fields["ho_officer_status"] = "Skip"
        update_fields["status"] = "Approved"
        update_fields["docstatus"] = 1
    elif stage == "Both":
        update_fields["reporting_person_status"] = "Skip"
        update_fields["ho_officer_status"] = "Skip"
        update_fields["status"] = "Approved"
        update_fields["docstatus"] = 1
        
        # Update child table items
        for item in doc.items:
            item.approved_quantity = item.quantity
            item.status = "Approved"
        doc.save(ignore_permissions=True)
    
    # Use db.set_value to bypass workflow and validation rules
    frappe.db.set_value("Employee Material Request", docname, update_fields)
    
    # Get the name of the person performing the action
    user_name = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "employee_name") or frappe.session.user
    
    # Record the action in comments
    doc.add_comment("Comment", f"Approval process skipped at {stage} stage by {user_name}.")
    
    frappe.db.commit()
    
    return {"status": "success"}

@frappe.whitelist()
def get_stock_history(item_code, warehouse):
    """
    Fetch stock entries for an item in a specific warehouse for the last 3 months.
    """
    from datetime import datetime, timedelta

    three_months_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d %H:%M:%S')
    
    stock_entries = frappe.db.sql("""
        SELECT 
            se.name, 
            se.posting_date, 
            se.posting_time,
            sed.actual_qty,
            sed.qty,
            sed.t_warehouse,
            se.stock_entry_type
        FROM `tabStock Entry` se
        JOIN `tabStock Entry Detail` sed ON se.name = sed.parent
        WHERE sed.item_code = %(item_code)s 
          AND sed.s_warehouse = %(warehouse)s
          AND sed.t_warehouse IS NULL
          AND se.posting_date >= %(three_months_ago)s
          AND se.docstatus = 1
        ORDER BY se.posting_date DESC, se.posting_time DESC
    """, {
        "item_code": item_code,
        "warehouse": warehouse,
        "three_months_ago": three_months_ago
    }, as_dict=True)
    
    return stock_entries
