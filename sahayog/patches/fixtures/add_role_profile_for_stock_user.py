import frappe

def execute():
    role_profile_name = "Stock User"

    try:
        # Check if the Role Profile already exists
        if not frappe.db.exists("Role Profile", role_profile_name):
            role_profile = frappe.get_doc({
                "doctype": "Role Profile",
                "role_profile": role_profile_name,
                "roles": [{"role": "Stock User"}],  # Assign relevant roles
            })
            role_profile.insert(ignore_permissions=True)
            frappe.db.commit()
            frappe.logger().info(f"✅ Created Role Profile: {role_profile_name}")
        else:
            frappe.logger().info(f"⚠️ Role Profile '{role_profile_name}' already exists.")

    except Exception as e:
        frappe.logger().error(f"❌ Error creating Role Profile '{role_profile_name}': {str(e)}")
