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

    if doc.custom_grn_srn == "Goods Receipt Note":
        doc.name = make_autoname(f"SB/GRN/{fiscal_year}/.#####")
    elif doc.custom_grn_srn == "Service Receipt Note":
        doc.name = make_autoname(f"SB/SRN/{fiscal_year}/.#####")
