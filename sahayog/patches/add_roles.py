import frappe

def execute():
	for role in ["Trainer", "Trainer Head","Procurement User","Branch Manager", "Cluster Manager", "Regional Manager", "Zonal Manager"]:
		if not frappe.db.exists("Role", role):
			frappe.get_doc({
				"doctype": "Role",
				"role_name": role,
				"desk_access": 1
			}).insert(ignore_permissions=True)