import frappe


def _get_linked_emr(doc):
    emr = getattr(doc, "custom_material_request", None)
    if not emr:
        return None
    if not frappe.db.exists("Employee Material Request", emr):
        return None
    return emr


def update_emr_status_on_stock_entry(doc, method=None):
    """When a Stock Entry (draft) is created against an EMR, mark EMR as Dispatch."""
    if doc.docstatus != 0:
        return

    emr = _get_linked_emr(doc)
    if not emr:
        return

    current_status = frappe.db.get_value("Employee Material Request", emr, "status")
    if current_status in ("Approved", "Partially Dispatched"):
        frappe.db.set_value("Employee Material Request", emr, "status", "Dispatch", update_modified=True)


def update_emr_status_on_stock_entry_submit(doc, method=None):
    """When a Stock Entry linked to an EMR is submitted, mark EMR as Received."""
    if doc.docstatus != 1:
        return

    emr = _get_linked_emr(doc)
    if not emr:
        return

    current_status = frappe.db.get_value("Employee Material Request", emr, "status")
    if current_status in ("Dispatch", "Dispatched", "Partially Dispatched", "Approved"):
        frappe.db.set_value("Employee Material Request", emr, "status", "Received", update_modified=True)
