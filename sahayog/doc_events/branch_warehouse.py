import frappe

def create_branch_warehouse(doc, method):
    """
    Automatically creates a warehouse when a new Branch is created and links it to the branch.
    """
    warehouse_name = f"Branch - {doc.name}"  # Warehouse name as 'Branch - <Branch Name>'

    if not frappe.db.exists("Warehouse", warehouse_name):
        warehouse = frappe.get_doc({
            "doctype": "Warehouse",
            "warehouse_name": warehouse_name,
            "company": frappe.defaults.get_defaults().get("company"),
            "is_group": 0,  # Make it a group warehouse
            "custom_warehouse_category": "Branch"
        })
        warehouse.insert(ignore_permissions=True)

        # Update the Branch with the created Warehouse
        doc.custom_warehouse = warehouse.name  # Use 'custom_warehouse' instead of 'branch_warehouse'
        doc.save(ignore_permissions=True)

        frappe.msgprint(f"✅ Warehouse '{warehouse_name}' created and linked to Branch.")
    else:
        frappe.msgprint(f"⚠️ Warehouse '{warehouse_name}' already exists.")
