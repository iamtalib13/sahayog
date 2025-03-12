import frappe

def supplier_quotation_on_submit(doc, method):
    frappe.logger().info(f"Processing Supplier Quotation: {doc.name}")

    for item in doc.items:
        frappe.logger().info(f"Checking Item: {item.item_code} for Supplier: {doc.supplier}")

        # Check if an Item Price already exists
        item_price = frappe.get_all(
            "Item Price",
            filters={"item_code": item.item_code, "supplier": doc.supplier},
            fields=["name", "price_list_rate"]
        )

        if item_price:
            # If found, update the price
            item_price_doc = frappe.get_doc("Item Price", item_price[0]["name"])
            old_price = item_price_doc.price_list_rate
            item_price_doc.price_list_rate = item.rate  # Update price
            item_price_doc.save()

            frappe.logger().info(f"Updated Item Price: {item_price_doc.name} | Old Price: {old_price} | New Price: {item.rate}")
        else:
            # If not found, create a new Item Price record
            new_item_price = frappe.get_doc({
                "doctype": "Item Price",
                "item_code": item.item_code,
                "supplier": doc.supplier,
                "price_list_rate": item.rate,
                "price_list": "Standard Buying",  # Adjust if needed
                "buying": 1
            })
            new_item_price.insert()

            frappe.logger().info(f"Created New Item Price for {item.item_code} | Price: {item.rate}")

        frappe.db.commit()  # Ensure changes are saved

    frappe.logger().info(f"Supplier Quotation {doc.name} processing completed.")
