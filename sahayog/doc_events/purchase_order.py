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
