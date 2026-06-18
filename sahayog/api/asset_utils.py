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
