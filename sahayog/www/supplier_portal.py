import frappe
from frappe.model.document import Document
@frappe.whitelist()
def get_rfq_items(rfq_name, supplier_name):
    """Fetch RFQ items dynamically based on the clicked RFQ and check for existing Supplier Quotation"""

    # Check if Supplier Quotation already exists for this supplier and RFQ
    existing_quotation = frappe.db.sql(
        """
        SELECT sq.name 
        FROM `tabSupplier Quotation` sq
        JOIN `tabSupplier Quotation Item` sqi ON sq.name = sqi.parent
        WHERE sq.supplier = %s AND sqi.request_for_quotation = %s
        LIMIT 1
        """, 
        (supplier_name, rfq_name),
        as_dict=True
    )

    # Fetch RFQ items
    items = frappe.get_all(
        "Request for Quotation Item",
        filters={"parent": rfq_name},
        fields=["item_code", "qty", "creation", "uom", "stock_uom"]
    )

    return {
        "success": True,
        "items": items,
        "existing_quotation": existing_quotation[0]['name'] if existing_quotation else None,
        "message": f"Supplier Quotation already exists: {existing_quotation[0]['name']}" if existing_quotation else "No existing Supplier Quotation found."
    }



@frappe.whitelist()
def get_sq_items(sq_name):
    """Fetch Supplier Quotation items dynamically based on the clicked SQ"""
    items = frappe.get_all(
        "Supplier Quotation Item",
        filters={"parent": sq_name},
        fields=["item_code", "qty", "amount", "base_amount"]
    )
    return items

@frappe.whitelist()
def create_supplier_quotation(supplier_name, rfq_name, transaction_date, items):
    try:
        frappe.log_error(
            f"Received Data: {supplier_name}, {rfq_name}, {transaction_date}, Items Count: {len(items)}",
            "Debug: Supplier Quotation"
        )

        # Convert `items` from JSON string if needed
        if isinstance(items, str):
            items = frappe.parse_json(items)

        if not items or not isinstance(items, list):
            return {"success": False, "message": "Invalid items format"}

        # Check if Supplier Quotation already exists for this supplier and RFQ
        existing_quotation = frappe.db.sql(
            """
            SELECT sq.name 
            FROM `tabSupplier Quotation` sq
            JOIN `tabSupplier Quotation Item` sqi ON sq.name = sqi.parent
            WHERE sq.supplier = %s AND sqi.request_for_quotation = %s
            LIMIT 1
            """, 
            (supplier_name, rfq_name),
            as_dict=True
        )

        if existing_quotation:
            return {
                "success": False,
                "message": f"Supplier Quotation already exists: {existing_quotation[0]['name']}"
            }

        # Create new Supplier Quotation
        doc = frappe.get_doc({
            "doctype": "Supplier Quotation",
            "supplier": supplier_name,
            "transaction_date": transaction_date,
            "items": []
        })

        for item in items:
            doc.append("items", {
                "item_code": item.get("item_code"),
                "qty": item.get("qty"),
                "rate": item.get("rate"),
                "amount": item.get("amount"),
                "request_for_quotation": rfq_name
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "success": True,
            "message": "Supplier Quotation created successfully!",
            "name": doc.name
        }
    except Exception as e:
        frappe.log_error(f"Error: {str(e)}", "Supplier Quotation Error")
        return {"success": False, "message": str(e)}
