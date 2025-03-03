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
