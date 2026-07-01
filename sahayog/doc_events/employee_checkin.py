import frappe


def clear_offshift(doc, method):
    """Reset offshift flag — this system does not use shifts."""
    doc.offshift = 0
