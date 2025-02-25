import frappe

def execute():
    """
    Creates predefined warehouses and dynamically adds warehouses for all branches.
    """
    warehouse_list = [
        "HO Gondia",
        "RO Nagpur",
        "Stationary Gondia"
    ]

    # Create predefined warehouses
    for warehouse in warehouse_list:
        create_warehouse_if_not_exists(warehouse)

    # Create warehouses for all existing branches
    branches = frappe.get_all("Branch", fields=["name"])
    for branch in branches:
        create_warehouse_if_not_exists(branch["name"])

    frappe.db.commit()  # Ensure changes are saved

def create_warehouse_if_not_exists(warehouse_name):
    """
    Check if warehouse exists, if not, create it.
    """
    if not frappe.db.exists("Warehouse", warehouse_name):
        warehouse = frappe.get_doc({
            "doctype": "Warehouse",
            "warehouse_name": warehouse_name,
            "company": frappe.defaults.get_defaults().get("company")  # Fetch default company
        })
        warehouse.insert(ignore_permissions=True)
        frappe.db.commit()
        print(f"✅ Warehouse Created: {warehouse_name}")
    else:
        print(f"⚠️ Warehouse Already Exists: {warehouse_name}")
