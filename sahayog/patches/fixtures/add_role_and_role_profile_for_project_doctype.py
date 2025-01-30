import frappe

def execute():
    """Ensure required Roles and Role Profiles exist and are correctly assigned"""

    # Define required roles and role profiles
    roles = ["Employee", "Project Manager", "Task Manager"]
    role_profiles = {
        "Project Manager": ["Employee", "Project Manager"],
        "Task Manager": ["Employee", "Task Manager"]
    }

    # Check and create roles if they don't exist
    for role_name in roles:
        if frappe.db.exists("Role", role_name):
            print(f"Role already exists: {role_name}")
        else:
            role = frappe.get_doc({
                "doctype": "Role",
                "role_name": role_name,
                "desk_access": 1
            })
            role.insert(ignore_permissions=True)
            print(f"Created Role: {role_name}")

    # Check and create/update role profiles
    for profile_name, required_roles in role_profiles.items():
        if frappe.db.exists("Role Profile", profile_name):
            role_profile = frappe.get_doc("Role Profile", profile_name)
            existing_roles = {r.role for r in role_profile.roles}
            added_roles = []

            # Add missing roles
            for role in required_roles:
                if role not in existing_roles:
                    role_profile.append("roles", {"role": role})
                    added_roles.append(role)

            # Save only if new roles were added
            if added_roles:
                role_profile.save(ignore_permissions=True)
                added_roles_str = ", ".join(added_roles)
                print(f"Updated Role Profile: {profile_name}, Added Roles: {added_roles_str}")
            else:
                print(f"Role Profile already exists: {profile_name} with all required roles.")
        else:
            role_profile = frappe.get_doc({
                "doctype": "Role Profile",
                "role_profile": profile_name,
                "roles": [{"role": role} for role in required_roles]
            })
            role_profile.insert(ignore_permissions=True)
            role_list_str = ", ".join(required_roles)
            print(f"Created Role Profile: {profile_name} with Roles: {role_list_str}")

    # Call the assign_permission function to assign permissions
    assign_permission()

    # Commit the changes
    frappe.db.commit()

def assign_permission():
    """Assign permissions to the roles based on specified doctype and roles"""
    
    # Define role permissions (Example: Setting detailed permissions on DocTypes)
    role_permissions = {
        "Project Manager": {
            "Project": {
                "select": 1, "create": 1, "email": 1, "export": 1, "read": 1, "report": 1, "share": 1, "write": 1, "print": 1
            },
            "Task": {
                "select": 1, "create": 1, "email": 1, "export": 1, "read": 1, "report": 1, "share": 1, "write": 1, "print": 1
            },
            "Letter of Intent": {
                "select": 1, "email": 1, "export": 1, "read": 1, "report": 1, "share": 1, "write": 1, "print": 1
            }
        },
        "Task Manager": {
            "Project": {
                "select": 1, "email": 1, "read": 1, "report": 1, "share": 1, "print": 1
            },
            "Task": {
                "select": 1, "create": 1, "email": 1, "export": 1, "read": 1, "report": 1, "share": 1, "write": 1, "print": 1
            },
            "Letter of Intent": {
                "select": 1, "create": 1, "email": 1, "export": 1, "read": 1, "report": 1, "share": 1, "write": 1, "submit": 1, "print": 1, "cancel": 1
            }
        }
    }

    # Assign Role Permissions for each Role and DocType
    for role, doctype_permissions in role_permissions.items():
        for doctype, permissions in doctype_permissions.items():
            # Check if the permissions already exist for the role and doctype
            existing_permission = frappe.db.exists(
                "Custom DocPerm", 
                {
                    "role": role,
                    "parent": doctype
                }
            )
            
            if not existing_permission:
                # Create new permission document
                docperm = frappe.get_doc({
                    "doctype": "Custom DocPerm",
                    "parent": doctype,
                    "parenttype": "DocType",
                    "parentfield": "permissions",
                    "role": role,
                    "select": permissions.get("select", 0),
                    "create": permissions.get("create", 0),
                    "email": permissions.get("email", 0),
                    "export": permissions.get("export", 0),
                    "read": permissions.get("read", 0),
                    "report": permissions.get("report", 0),
                    "share": permissions.get("share", 0),
                    "write": permissions.get("write", 0),
                    "print": permissions.get("print", 0),
                    "delete": permissions.get("delete", 0),
                    "submit": permissions.get("submit", 0),
                    "cancel": permissions.get("cancel", 0),
                })
                docperm.insert(ignore_permissions=True)
                print(f"Added Permissions: {role} -> {doctype} ({', '.join([f'{k}: {v}' for k, v in permissions.items()])})")
            else:
                print(f"Permissions already exist: {role} -> {doctype}")

    # Commit the changes
    frappe.db.commit()
