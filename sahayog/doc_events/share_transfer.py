import frappe
from frappe import _
from frappe.model.naming import getseries


def get_share_transfer_name(sol_id):
    """
    Generate Share Transfer name based on SOL ID
    Format: SOLID (4 digits) + Series (6 digits)
    Example: 1001000001, 1001000002, etc.
    """
    try:
        # Ensure SOL ID is 4 digits (pad with zeros if needed)
        sol_id_padded = str(sol_id).zfill(4)

        # Get next number in series for this SOL ID (6 digits)
        series_number = getseries(sol_id_padded, 6)

        # Combine SOL ID + series number
        return f"{sol_id_padded}{series_number}"

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Share Transfer Naming Error")
        frappe.throw(_("Error generating Share Transfer name: {0}").format(str(e)))


def share_transfer_autoname(doc, method):
    """
    Custom autoname for Share Transfer
    Uses the sol_id field directly from the Share Transfer document
    """
    if not doc.sol_id:
        frappe.throw(_("SOL ID is required for Share Transfer naming"))

    try:
        doc.name = get_share_transfer_name(doc.sol_id)

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Share Transfer Naming Error")
        frappe.throw(_("Error in Share Transfer naming: {0}").format(str(e)))
