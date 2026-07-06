import frappe

def execute():
    """Add Trainer Head and Employee roles to Trainer workspace and grant permissions"""
    
    # Check if workspace exists
    if not frappe.db.exists("Workspace", "Trainer"):
        print("Trainer workspace not found")
        return
    
    # Get the workspace document
    workspace = frappe.get_doc("Workspace", "Trainer")
    
    # Check existing roles
    existing_roles = [role.role for role in workspace.roles]
    
    # Add Trainer Head role if not exists
    if "Trainer Head" not in existing_roles:
        workspace.append("roles", {
            "role": "Trainer Head"
        })
        print("Added Trainer Head role to Trainer workspace")
    else:
        print("Trainer Head role already exists in Trainer workspace")
    
    # Add Employee role if not exists
    if "Employee" not in existing_roles:
        workspace.append("roles", {
            "role": "Employee"
        })
        print("Added Employee role to Trainer workspace")
    else:
        print("Employee role already exists in Trainer workspace")
    
    # Save and commit
    workspace.save(ignore_permissions=True)
    frappe.db.commit()
    
    # Grant Workspace read permission to Employee role if not exists
    if not frappe.db.exists("Custom DocPerm", {
        "parent": "Workspace",
        "role": "Employee",
        "permlevel": 0
    }):
        frappe.get_doc({
            "doctype": "Custom DocPerm",
            "parent": "Workspace",
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": "Employee",
            "permlevel": 0,
            "read": 1,
            "select": 1
        }).insert(ignore_permissions=True)
        print("Added Workspace read permission for Employee role")
    
    frappe.db.commit()
    
    # Clear cache
    frappe.clear_cache()
    print("Trainer workspace updated successfully")
