import frappe

def execute():
    """
    ✅ Create/Update Branch Warehouses
    ✅ Create Project Warehouses if not exist
    ✅ Assign Warehouse to Branch custom field
    """
    create_branch_warehouses()
    create_project_warehouses()
    frappe.db.commit()

def create_branch_warehouses():
    warehouse_list = [
        "Store - Stationary Gondia",
        "Store - Gondia IT",
        "Store - Nagpur IT"
    ]

    # Step 1: Create predefined store warehouses
    for warehouse in warehouse_list:
        create_or_update_warehouse(warehouse, is_group=False, category="Store")

    # Step 2: Create branch-specific warehouses
    branches = frappe.get_all("Branch", fields=["name"])
    for branch in branches:
        warehouse_name = f"Branch - {branch['name']}"
        if not frappe.db.exists("Warehouse", warehouse_name):
            create_or_update_warehouse(warehouse_name, is_group=False, category="Branch")
            frappe.db.set_value("Branch", branch["name"], "custom_warehouse", warehouse_name)

def create_project_warehouses():
    projects = frappe.get_all("Project", fields=["name", "project_name"])
    for project in projects:
        # Use 'project_name' field from the Project Doc as warehouse name
        warehouse_name = f"Project - {project['project_name']}"
        if not frappe.db.exists("Warehouse", warehouse_name):
            warehouse = frappe.get_doc({
                "doctype": "Warehouse",
                "warehouse_name": warehouse_name,
                "company": frappe.defaults.get_defaults().get("company"),
                "is_group": 0,
                "custom_warehouse_category": "Project",
                "project_name": project['name']  # Storing the project id for reference
            })
            warehouse.insert(ignore_permissions=True)
            frappe.db.set_value("Project", project["name"], "custom_project_warehouse", warehouse_name)
            print(f"✅ Created Warehouse: {warehouse_name}")

def create_or_update_warehouse(warehouse_name, is_group=False, category=None):
    """
    Create or update warehouse with optional category
    """
    if frappe.db.exists("Warehouse", warehouse_name):
        print(f"Warehouse already exists: {warehouse_name}")
        return warehouse_name

    warehouse = frappe.get_doc({
        "doctype": "Warehouse",
        "warehouse_name": warehouse_name,
        "company": frappe.defaults.get_defaults().get("company"),
        "is_group": 1 if is_group else 0,
        "custom_warehouse_category": category
    })
    warehouse.insert(ignore_permissions=True)
    print(f"✅ Created Warehouse: {warehouse_name}")
    return warehouse_name
