import frappe
import json
from erpnext.stock.get_item_details import get_item_details as original_get_item_details
from erpnext.stock.get_item_details import apply_price_list as original_apply_price_list

@frappe.whitelist()
def custom_get_item_details(args, doc=None, for_validate=False, overwrite_warehouse=True):
    if isinstance(args, str):  
        args = json.loads(args)  # Convert JSON string to dictionary
    
    out = original_get_item_details(args, doc, for_validate, overwrite_warehouse)

    # Ensure last_purchase_price is added only for Supplier Quotation
    if args.get("doctype") == "Supplier Quotation":
        out["last_purchase_price"] = out.get("price_list_rate", 0)  # Use price_list_rate as fallback

    return out

@frappe.whitelist()
def custom_apply_price_list(args, as_doc=False, doc=None):
    if isinstance(args, str):
        args = json.loads(args)  # Convert JSON string to dictionary

    parent = original_apply_price_list(args, as_doc, doc)  # Call original function

    # Ensure last_purchase_price updates when supplier changes
    if args.get("doctype") == "Supplier Quotation" and args.get("items"):
        supplier = args.get("supplier")
        
        for item in args["items"]:
            # Fetch new price list rate from applied price list
            price_list_rate = item.get("price_list_rate", 0)

            # Force update last_purchase_price only when supplier changes
            if supplier:
                item["last_purchase_price"] = price_list_rate

    return parent
