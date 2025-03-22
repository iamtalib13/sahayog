import frappe
from frappe.model.document import Document
from frappe.utils import pretty_date
from bs4 import BeautifulSoup
import json

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
        fields=["item_code", "qty", "creation", "uom", "stock_uom","warehouse"]
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
    if not sq_name:
        return {"message":("Missing Supplier Quotation Name")}

    try:
        items = frappe.get_all(
            "Supplier Quotation Item",
            filters={"parent": sq_name},
            fields=["item_code", "qty", "amount", "base_amount", "last_purchase_price","proposed_price","show_proposed_price"]
        )

        return {"message": items if items else ("No items found for this SQ")}
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(),("Error fetching SQ items"))
        return {"error": str(e)}
    

@frappe.whitelist()
def create_supplier_quotation(supplier_name, rfq_name, transaction_date, items, custom_request_for,custom_project,custom_branch):
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
            "custom_request_for": custom_request_for,
            "custom_project": custom_project,
            "custom_branch": custom_branch,
            "items": []
        })

        for item in items:
            item_code = item.get("item_code")
            qty = item.get("qty")
            warehouse = item.get("warehouse")
            rate = item.get("rate") or 0
            amount = item.get("amount") or 0

            # Fetch price_list_rate from Item Price where item_code and supplier match
            price_list_rate = frappe.db.get_value("Item Price", 
                                                  {"item_code": item_code, "supplier": supplier_name}, 
                                                  "price_list_rate")

            last_purchase_price = price_list_rate if price_list_rate is not None else 0  # Set to 0 if not found

            doc.append("items", {
                "item_code": item_code,
                "qty": qty,
                "warehouse": warehouse,
                "rate": rate,
                "amount": amount,
                "last_purchase_price": last_purchase_price,  # Setting last_purchase_price
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


@frappe.whitelist()
def update_sq_items(sq_name, items):
    try:
        # Ensure items is not empty
        if not items:
            return {"error": "Items data is missing"}

        # Decode JSON properly
        try:
            items = json.loads(items)
        except json.JSONDecodeError:
            return {"error": "Invalid JSON format in items"}

        if not sq_name or not items:
            return {"error": "Missing supplier quotation name or items"}

        # Fetch the Supplier Quotation document
        sq_doc = frappe.get_doc("Supplier Quotation", sq_name)

        # Update items
        for item in sq_doc.items:
            for updated_item in items:
                if item.item_code == updated_item["item_code"]:
                    item.qty = updated_item["qty"]
                    item.rate = updated_item["rate"]

        # Save the document
        sq_doc.save()
        frappe.db.commit()

        return {"message": "success"}

    except Exception as e:
        frappe.log_error(f"Error in update_sq_items: {str(e)}")
        return {"error": str(e)}
 
@frappe.whitelist()
def get_sq_comments(sq_name):
    comments = frappe.get_all(
        "Comment",
        filters={"reference_name": sq_name, "reference_doctype": "Supplier Quotation"},
        fields=["owner", "creation", "content as comment","name"],
        order_by="creation desc"
    )

    # Clean comment text and add pretty date
    for comment in comments:
        comment["comment"] = BeautifulSoup(comment["comment"], "html.parser").get_text(strip=True)
        comment["pretty_creation"] = pretty_date(comment["creation"])  # Add human-readable date

    return {"message": comments}


@frappe.whitelist()
def add_sq_comment(sq_name, comment):
    if not sq_name or not comment:
        return {"error": "Missing parameters"}

    new_comment = frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Comment",
        "reference_doctype": "Supplier Quotation",
        "reference_name": sq_name,
        "content": comment,
        "comment_by": frappe.session.user
    })
    new_comment.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"message": "Comment added successfully!"}


@frappe.whitelist()
def update_sq_comment(comment_id, updated_comment):
    try:
        comment = frappe.get_doc("Comment", comment_id)
        comment.content = updated_comment
        comment.save(ignore_permissions=True)
        frappe.db.commit()
        return {"message": "success"}
    except Exception as e:
        return {"error": str(e)}
    
@frappe.whitelist()
def delete_sq_comment(comment_id):
    try:
        frappe.delete_doc("Comment", comment_id, ignore_permissions=True)
        frappe.db.commit()
        return {"message": "success"}
    except Exception as e:
        return {"error": str(e)}
   