import frappe

@frappe.whitelist()
def get_rfq_items(rfq_name):
    """Fetch RFQ items dynamically based on the clicked RFQ"""
    items = frappe.get_all(
        "Request for Quotation Item",
        filters={"parent": rfq_name},
        fields=["item_code", "qty", "creation"]
    )
    return items


@frappe.whitelist()
def get_sq_items(sq_name):
    """Fetch Supplier Quotation items dynamically based on the clicked SQ"""
    items = frappe.get_all(
        "Supplier Quotation Item",
        filters={"parent": sq_name},
        fields=["item_code", "qty", "amount", "base_amount"]
    )
    return items