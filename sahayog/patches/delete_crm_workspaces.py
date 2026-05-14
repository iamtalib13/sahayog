import frappe

def execute():
    # Delete requested Workspaces
    workspaces_to_delete = ["CRM BM", "CRM-RM", "CRM-ZM", "CRM-Operations"]
    for ws_name in workspaces_to_delete:
        if frappe.db.exists("Workspace", ws_name):
            frappe.delete_doc("Workspace", ws_name, ignore_missing=True, force=True)
    
    frappe.db.commit()
