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
    # am.company = emmr_doc.company
    am.purpose = "Issue"
    am.custom_reference_doctype = "Employee Material Request"
    am.custom_reference_name = emmr_doc.name

# Child table (MANDATORY employee)
    for row in assets:
        am.append(
            "assets", {
                "asset": row["asset"],
                "source_location": row["location"],
                "from_employee": row["custodian"],
                "to_employee": row["employee"],
            })
        
        # Update Asset Workflow State to 'Assign'
        try:
            frappe.db.set_value("Asset", row["asset"], "workflow_state", "Assign")
        except Exception:
            pass

    am.insert(ignore_permissions=True)
    am.submit()

    return am.name
