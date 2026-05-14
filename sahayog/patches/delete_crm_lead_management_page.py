import frappe
import json

def execute():
    # Delete the Page record
    if frappe.db.exists("Page", "crm-lead-management"):
        frappe.delete_doc("Page", "crm-lead-management", ignore_missing=True, force=True)
    
    # Cleanup Workspaces in database
    target_shortcuts = ["Lead Report", "Branch Lead Report", "Region Lead Report"]
    
    workspaces = frappe.get_all("Workspace", filters={"public": 1})
    for ws_info in workspaces:
        ws = frappe.get_doc("Workspace", ws_info.name)
        modified = False
        
        # 1. Cleanup shortcuts table
        if hasattr(ws, "shortcuts"):
            new_shortcuts = [s for s in ws.shortcuts if s.link_to != "crm-lead-management"]
            if len(new_shortcuts) != len(ws.shortcuts):
                ws.shortcuts = new_shortcuts
                modified = True
        
        # 2. Cleanup content JSON string
        if ws.content:
            try:
                content_data = json.loads(ws.content)
                if isinstance(content_data, list):
                    new_content = []
                    content_changed = False
                    for item in content_data:
                        if item.get("type") == "shortcut":
                            shortcut_name = item.get("data", {}).get("shortcut_name")
                            # We check both the name (from our findings) and potentially look up the shortcut if needed
                            # But since we've already filtered ws.shortcuts, matching by name is usually enough for these specific ones
                            if shortcut_name in target_shortcuts:
                                content_changed = True
                                continue
                        new_content.append(item)
                    
                    if content_changed:
                        ws.content = json.dumps(new_content)
                        modified = True
            except Exception:
                pass
        
        if modified:
            ws.save(ignore_permissions=True)
            frappe.db.commit()
