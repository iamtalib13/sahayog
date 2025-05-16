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
