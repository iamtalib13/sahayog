import frappe

@frappe.whitelist()
def get_serial_warehouse_map():
    # 1. Get all serial-to-bundle entries
    # Using frappe.db.get_all with ignore_permissions=True to bypass restrictions
    entries = frappe.db.get_all("Serial and Batch Entry", 
                                fields=["serial_no", "parent"], 
                                ignore_permissions=True)
    
    # 2. Get the bundles to link to Purchase Receipts
    bundle_names = list(set([e.parent for e in entries]))
    bundles = frappe.db.get_all("Serial and Batch Bundle", 
                                filters={"name": ["in", bundle_names]}, 
                                fields=["name", "voucher_no", "voucher_type"], 
                                ignore_permissions=True)
    
    bundle_map = {b.name: b for b in bundles}
    
    # 3. Get the Purchase Receipts to find the warehouse
    pr_names = list(set([b.voucher_no for b in bundles if b.voucher_type == "Purchase Receipt"]))
    prs = frappe.db.get_all("Purchase Receipt", 
                            filters={"name": ["in", pr_names]}, 
                            fields=["name", "set_warehouse"], 
                            ignore_permissions=True)
    
    pr_map = {p.name: p.set_warehouse for p in prs}
    
    # 4. Construct final mapping: serial_no -> warehouse
    serial_map = {}
    for e in entries:
        bundle = bundle_map.get(e.parent)
        if bundle and bundle.voucher_type == "Purchase Receipt":
            warehouse = pr_map.get(bundle.voucher_no)
            if warehouse:
                serial_map[e.serial_no] = warehouse
                
    return serial_map


@frappe.whitelist()
def get_available_assets():
    """
    Get assets and serial nos that are available for assignment:
    - Serial Nos not linked to any submitted Asset
    - Assets with no movement at all, OR
    - Assets with movement but no source_location and no from_employee
    """

    # 1. Get all active assets (draft/submitted, not scrapped)
    all_assets = frappe.db.get_all(
        "Asset",
        filters={"docstatus": ["in", [0, 1]], "status": ["!=", "Scrapped"]},
        fields=["name", "serial_no", "item_code", "location", "zone"],
        limit_page_length=0,
        ignore_permissions=True
    )
    used_serials = [a.serial_no for a in all_assets if a.serial_no]

    # 2. Get all Serial Nos and filter unassigned ones
    all_serials = frappe.db.get_all(
        "Serial No",
        fields=["name", "item_code"],
        limit_page_length=0,
        ignore_permissions=True
    )
    unassigned_serials = [s for s in all_serials if s.name not in used_serials]

    # 3. Get warehouse map for unassigned serials
    warehouse_map = _get_serial_warehouse_map()

    unassigned_serials_with_warehouse = []
    for s in unassigned_serials:
        unassigned_serials_with_warehouse.append({
            "name": s.name,
            "item_code": s.item_code,
            "warehouse": warehouse_map.get(s.name)
        })

    # 4. Get all Asset Movement Items to check movements
    movement_items = frappe.db.get_all(
        "Asset Movement Item",
        fields=["asset", "source_location", "from_employee"],
        limit_page_length=0,
        ignore_permissions=True
    )
    
    # 5. Build map: asset -> movement details
    asset_movement_map = {}
    for mv in movement_items:
        asset_id = mv.asset
        if asset_id not in asset_movement_map:
            asset_movement_map[asset_id] = mv
    
    # 6. Filter available assets
    available_assets = []
    for asset in all_assets:
        mv = asset_movement_map.get(asset.name)
        if not mv:
            available_assets.append(asset)
        elif not mv.source_location and not mv.from_employee:
            available_assets.append(asset)
    
    return {
        "serials": unassigned_serials_with_warehouse,
        "assets": available_assets
    }


def _get_serial_warehouse_map():
    entries = frappe.db.get_all("Serial and Batch Entry", 
                                fields=["serial_no", "parent"], 
                                ignore_permissions=True)
    bundle_names = list(set([e.parent for e in entries]))
    bundles = frappe.db.get_all("Serial and Batch Bundle", 
                                filters={"name": ["in", bundle_names]}, 
                                fields=["name", "voucher_no", "voucher_type"], 
                                ignore_permissions=True)
    bundle_map = {b.name: b for b in bundles}
    pr_names = list(set([b.voucher_no for b in bundles if b.voucher_type == "Purchase Receipt"]))
    prs = frappe.db.get_all("Purchase Receipt", 
                            filters={"name": ["in", pr_names]}, 
                            fields=["name", "set_warehouse"], 
                            ignore_permissions=True)
    pr_map = {p.name: p.set_warehouse for p in prs}
    serial_map = {}
    for e in entries:
        bundle = bundle_map.get(e.parent)
        if bundle and bundle.voucher_type == "Purchase Receipt":
            warehouse = pr_map.get(bundle.voucher_no)
            if warehouse:
                serial_map[e.serial_no] = warehouse
    return serial_map


@frappe.whitelist()
def update_submitted_asset_serial_no(asset_name, serial_no):
    """
    Force updates the serial_no field on an Asset (even if submitted)
    and returns the updated Asset document.
    """
    frappe.db.set_value("Asset", asset_name, "serial_no", serial_no)
    frappe.db.commit()
    return frappe.get_doc("Asset", asset_name)
