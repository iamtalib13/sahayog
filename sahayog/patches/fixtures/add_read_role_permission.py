import frappe

def execute():
    # List of doctypes to update
    doctypes = ["Division", "Zone", "Region", "Branch", "Project Template"]

    # Get all roles except System Manager and Administrator
    roles = frappe.get_all("Role", filters={"disabled": 0}, pluck="name")
    roles = [role for role in roles if role not in ["System Manager", "Administrator"]]

    for doctype in doctypes:
        for role in roles:
            try:
                # Check if the permission already exists
                existing_permissions = frappe.get_all(
                    "Custom DocPerm",
                    filters={"parent": doctype, "role": role},
                    pluck="name"
                )

                if existing_permissions:
                    # Only enable read permission without modifying other fields
                    frappe.db.sql("""
                        UPDATE `tabCustom DocPerm`
                        SET `read` = 1
                        WHERE `parent` = %s AND `role` = %s AND `read` = 0
                    """, (doctype, role))
                    
                    print(f"✅ Read access enabled for {role} on {doctype} (Existing permissions preserved)")
                else:
                    # Create new permission if not exists
                    new_permission = frappe.get_doc({
                        "doctype": "Custom DocPerm",
                        "parent": doctype,
                        "parentfield": "permissions",
                        "parenttype": "DocType",
                        "role": role,
                        "read": 1
                    })
                    new_permission.insert(ignore_permissions=True)
                    print(f"✅ Added new read-only permission for {role} on {doctype}")

            except Exception as e:
                frappe.log_error(f"❌ Error setting permissions for {role} on {doctype}: {str(e)}")
                print(f"❌ Error setting permissions for {role} on {doctype}: {str(e)}")

    frappe.db.commit()
    print("✅ Read permissions set for Division, Zone, Region, Branch, and Project Template without modifying existing settings.")
