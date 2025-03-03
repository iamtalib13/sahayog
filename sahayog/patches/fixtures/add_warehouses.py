import frappe

def execute():
    """
    1️⃣ Existing warehouses ko update karega.
    2️⃣ Agar warehouse nahi hai to naye create karega.
    3️⃣ Branch Doctype ke 'custom_warehouse' field me warehouse assign karega.
    """

    warehouse_list = [
        "Stationary Gondia"
    ]

    # Step 1: Predefined Warehouses ko create/update karo
    for warehouse in warehouse_list:
        create_or_update_warehouse(warehouse, is_group=True)

    # Step 2: Branch-wise Warehouses ko create/update karo
    branches = frappe.get_all("Branch", fields=["name"])
    for branch in branches:
        warehouse_name = branch["name"]
        warehouse = create_or_update_warehouse(warehouse_name, is_group=True)
        
        # Step 3: Branch Doctype ke `custom_warehouse` me warehouse assign karo
        if warehouse:
            frappe.db.set_value("Branch", branch["name"], "custom_warehouse", warehouse_name)
            print(f"✅ Warehouse Linked to Branch: {branch['name']} -> {warehouse_name}")

    frappe.db.commit()  # Final commit ek baar karna best practice hai

def create_or_update_warehouse(warehouse_name, is_group=False):
    """
    Agar warehouse exist karta hai to update karega,
    warna naya create karega aur return karega.
    """
    if frappe.db.exists("Warehouse", warehouse_name):
        # ✅ Update existing warehouse
        frappe.db.set_value("Warehouse", warehouse_name, {
            "is_group": 1 if is_group else 0,
            "company": frappe.defaults.get_defaults().get("company")
        })
        print(f"🔄 Warehouse Updated: {warehouse_name} (Group: {is_group})")
    else:
        # ✅ Naya warehouse create karo
        warehouse = frappe.get_doc({
            "doctype": "Warehouse",
            "warehouse_name": warehouse_name,
            "company": frappe.defaults.get_defaults().get("company"),
            "is_group": 1 if is_group else 0
        })
        warehouse.insert(ignore_permissions=True)
        print(f"✅ Warehouse Created: {warehouse_name} (Group: {is_group})")
    
    return warehouse_name  # Warehouse name return karna taaki link ho sake
