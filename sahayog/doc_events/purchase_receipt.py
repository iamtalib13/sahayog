import frappe
from frappe.model.naming import make_autoname
from frappe.utils import now_datetime

def get_short_fiscal_year():
    """Return the current Indian fiscal year in short format (YY-YY)."""
    today = now_datetime()
    start_year = today.year if today.month >= 4 else today.year - 1
    short_start = str(start_year)[-2:]  # Get last two digits of the start year
    short_end = str(start_year + 1)[-2:]  # Get last two digits of the next year
    return f"{short_start}-{short_end}"

def purchase_receipt_autoname(doc, method):
    """Set custom naming series for Purchase Receipt based on GRN or SRN."""
    fiscal_year = get_short_fiscal_year()  # Get dynamically calculated short fiscal year

    if doc.custom_po_wo == "Purchase Order":
        doc.name = make_autoname(f"SB/GRN/{fiscal_year}/.#####")
    elif doc.custom_po_wo == "Work Order":
        doc.name = make_autoname(f"SB/SRN/{fiscal_year}/.#####")


def validate_store_incharge(doc, method):
    """Validate Store Incharge based on the selected Branch."""
    if doc.custom_sahayog_status == "Received" and not doc.custom_received_remarks:
        frappe.throw("Received Remarks is mandatory.") 

    if doc.custom_sahayog_status == "Received" and not doc.custom_store_incharge:
        frappe.throw("Store Incharge is mandatory.")


def set_gst_amounts(doc, method=None):
    """Set GST-calculated amount on Purchase Receipt items and totals."""
    has_gst = False
    for item in doc.get("items", []):
        gst = item.get("custom_gst")
        if gst is None:
            continue
        has_gst = True
        rate = item.get("rate") or 0
        qty = item.get("qty") or 0
        calc = (rate + (rate * ((float(gst) * 0.5) / 100))) * qty
        item.custom_calculated_amount = calc
        item.amount = calc
        item.net_amount = calc
        item.base_amount = calc * (doc.conversion_rate or 1)
        item.base_net_amount = calc * (doc.conversion_rate or 1)

    if has_gst:
        total = sum((item.get("amount") or 0) for item in doc.get("items", []))
        doc.total = total
        doc.net_total = total
        doc.grand_total = total
        doc.rounded_total = round(total)
        doc.base_total = total * (doc.conversion_rate or 1)
        doc.base_net_total = total * (doc.conversion_rate or 1)
        doc.base_grand_total = total * (doc.conversion_rate or 1)
        doc.base_rounded_total = round(total * (doc.conversion_rate or 1))
