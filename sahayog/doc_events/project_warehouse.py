import frappe

def create_project_warehouse(doc, method):
    """
    Automatically creates a warehouse when a new Project is created 
    and links it to the project's 'custom_project_warehouse' field.
    """
    warehouse_name = f"Project - {doc.project_name}"  # Warehouse name as 'Project - <Project Name>'
    
    if not frappe.db.exists("Warehouse", warehouse_name):
        warehouse = frappe.get_doc({
            "doctype": "Warehouse",
            "warehouse_name": warehouse_name,
            "company": frappe.defaults.get_defaults().get("company"),
            "is_group": 0,  # Make it a non-group warehouse
            "custom_warehouse_category": "Project"
        })
        warehouse.insert(ignore_permissions=True)
        
        # Link the created warehouse to the project's custom field
        doc.custom_project_warehouse = warehouse.name
        doc.save(ignore_permissions=True)

        frappe.msgprint(f"✅ Warehouse '{warehouse_name}' created and linked to project '{doc.name}'.")
    else:
        
        frappe.msgprint(f"⚠️ Warehouse '{warehouse_name}' already exists and linked to project '{doc.name}'.")

