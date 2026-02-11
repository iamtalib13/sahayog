import frappe

def execute():
    """
    One-time patch to populate finacle_gl_code in Expense Category
    """
    # Map of Category Name -> Base GL Suffix
    category_map = {
        "Office Refreshments": "01840390001",
        "Water Bills": "01850180001",
        "Office Stationery": "01840380001",
        "Cleaning and House Keeping": "01850020001",
        "Minor Repairs & Maintenance": "01850080001",
        "Courier, Postage, Photocopying": "01830010001",
        "Safety": "01840400001",
        "Other Expenses": "00000000000"
    }

    for cat_name, suffix in category_map.items():
        # Find the ID (name) of the category matching the label
        category_id = frappe.db.get_value("Expense Category", {"category_name": cat_name}, "name")
        
        if category_id:
            frappe.db.set_value("Expense Category", category_id, "finacle_gl_code", suffix, update_modified=False)
            print(f"✓ Updated '{cat_name}' ({category_id}) -> {suffix}")
        else:
            print(f"⚠ Skipped '{cat_name}' (Not found in category_name field)")

    frappe.db.commit()
