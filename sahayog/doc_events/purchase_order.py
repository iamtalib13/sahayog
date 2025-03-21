import frappe
from frappe.utils import now_datetime
from frappe.model.naming import make_autoname

def create_purchase_receipt(doc, method):
    """Create a draft Purchase Receipt when a Purchase Order is submitted."""
    
    # Create a new Purchase Receipt
    pr = frappe.new_doc("Purchase Receipt")
    pr.supplier = doc.supplier
    pr.purchase_order = doc.name  # Link to the submitted Purchase Order
    pr.set_warehouse = doc.set_warehouse
    pr.custom_grn_srn = doc.custom_grn_srn
    
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

def get_short_fiscal_year():
    """Return the current Indian fiscal year in short format (YY-YY)."""
    today = now_datetime()
    start_year = today.year if today.month >= 4 else today.year - 1
    short_start = str(start_year)[-2:]  # Get last two digits of the start year
    short_end = str(start_year + 1)[-2:]  # Get last two digits of the next year
    return f"{short_start}-{short_end}"

def purchase_order_autoname(doc, method):
    """Set custom naming series for Purchase Order based on GRN or SRN."""
    fiscal_year = get_short_fiscal_year()  # Get dynamically calculated short fiscal year

    if doc.custom_grn_srn == "Goods Receipt Note":
        doc.name = make_autoname(f"SB/PO/{fiscal_year}/.#####")
    elif doc.custom_grn_srn == "Service Receipt Note":
        doc.name = make_autoname(f"SB/WO/{fiscal_year}/.#####")

