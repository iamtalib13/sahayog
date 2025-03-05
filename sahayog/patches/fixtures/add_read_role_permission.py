import frappe

def execute():
    # List of doctypes to update
    doctypes = ["Division", "Zone", "Region", "Branch"]

    # Get all roles except System Manager
    roles = frappe.get_all("Role", filters={"disabled": 0}, pluck="name")
    roles = [role for role in roles if role != "System Manager"]  # Exclude System Manager

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
                    frappe.db.set_value(
                        "Custom DocPerm", {"parent": doctype, "role": role}, {
                            "read": 1
                        }
                    )
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
    print("✅ Read permissions set for Division, Zone, Region, and Branch (without modifying existing permissions).")
