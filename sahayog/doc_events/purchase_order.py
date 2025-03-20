import frappe

def create_purchase_receipt(doc, method):
    """Create a draft Purchase Receipt when a Purchase Order is submitted."""
    
    # Create a new Purchase Receipt
    pr = frappe.new_doc("Purchase Receipt")
    pr.supplier = doc.supplier
    pr.purchase_order = doc.name  # Link to the submitted Purchase Order
    pr.set_warehouse = doc.set_warehouse
    
    # Copy items from PO to PR
    for item in doc.items:
        pr.append("items", {
            "item_code": item.item_code,
            "item_name": item.item_name,
            "description": item.description,
            "qty": item.qty,
            "uom": item.uom,
            "stock_uom": item.stock_uom,
            "conversion_factor": item.conversion_factor,
            "rate": item.rate,
            "amount": item.amount,
            "warehouse": item.warehouse,
            "purchase_order": doc.name  # Linking to PO item
        })
    
    # Save PR as Draft
    pr.insert()
    frappe.msgprint(f"Purchase Receipt {pr.name} created in Draft status.", alert=True)


def sync_project_field(doc, method):
    """
    Before Save: Sync custom_project value to project field
    """
    if doc.custom_project:
        doc.project = doc.custom_project
        frappe.logger().info(f"✅ Synced custom_project to project for {doc.name}")
    else:
        doc.project = None  # Optional: clear project if custom_project is empty
        frappe.logger().info(f"ℹ️ Cleared project for {doc.name} as custom_project is empty")