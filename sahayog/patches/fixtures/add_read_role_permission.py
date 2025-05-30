import frappe

def execute():
    doctypes = ["Division", "Zone", "Region", "Branch", "Project Template"]
    employee_role = "Employee"

    # Get all active roles except System Manager and Administrator
    roles = frappe.get_all("Role", filters={"disabled": 0}, pluck="name")
    roles_to_remove = [r for r in roles if r not in ["System Manager", "Administrator", employee_role]]

    # 🧹 Step 1: Remove junk permissions (if exist)
    for doctype in doctypes:
        for role in roles_to_remove:
            perm_names = frappe.get_all("Custom DocPerm", filters={"parent": doctype, "role": role}, pluck="name")
            if perm_names:
                frappe.db.sql("""
                    DELETE FROM `tabCustom DocPerm`
                    WHERE `parent` = %s AND `role` = %s
                """, (doctype, role))
                print(f"🗑️ Removed permission for role '{role}' on '{doctype}'")

    # ✅ Step 2: Add read-only permission for 'Employee' if not already exists
    for doctype in doctypes:
        exists = frappe.get_all("Custom DocPerm", filters={"parent": doctype, "role": employee_role})
        if not exists:
            doc = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "parentfield": "permissions",
                "parenttype": "DocType",
                "role": employee_role,
                "read": 1
            })
            doc.insert(ignore_permissions=True)
            print(f"✅ Added read-only permission for 'Employee' on '{doctype}'")
        else:
            print(f"⏩ 'Employee' already has permission on '{doctype}', skipping")

    frappe.db.commit()
    print("🎯 Cleanup and setup complete.")
