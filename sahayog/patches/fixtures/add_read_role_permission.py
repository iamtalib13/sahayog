import frappe

def execute():
    doctypes = ["Division", "Zone", "Region", "Branch", "Project Template"]
    role = "Employee"

    for doctype in doctypes:
        try:
            # Check if Employee role permission already exists for this doctype
            existing_permissions = frappe.get_all(
                "Custom DocPerm",
                filters={"parent": doctype, "role": role},
                pluck="name"
            )

            if existing_permissions:
                # Enable read permission if not already enabled
                frappe.db.sql("""
                    UPDATE `tabCustom DocPerm`
                    SET `read` = 1
                    WHERE `parent` = %s AND `role` = %s AND `read` = 0
                """, (doctype, role))
                print(f"✅ Read access enabled for {role} on {doctype} (Existing permissions preserved)")
            else:
                # Create new read-only permission for Employee role
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
    print("✅ Read permissions set for Employee role on selected doctypes.")
