import frappe
import json
from frappe import _

@frappe.whitelist()
def get_active_users_list(search_text=None, exclude_users=None, limit=1000):
    """Get list of active users with name and full_name - with search functionality"""
    try:
        # Default exclude users
        if not exclude_users:
            exclude_users = ["Guest", "Administrator"]
        elif isinstance(exclude_users, str):
            exclude_users = json.loads(exclude_users)
        
        # Base filters
        filters = {
            "enabled": 1,
            "name": ["not in", exclude_users]
        }
        
        # Add search filter if provided
        or_filters = {}
        if search_text:
            or_filters = {
                "name": ["like", f"%{search_text}%"],
                "full_name": ["like", f"%{search_text}%"]
            }
        
        # Get active users with search
        users = frappe.get_list(
            "User",
            filters=filters,
            or_filters=or_filters if search_text else None,
            fields=["name", "full_name"],
            order_by="full_name asc, name asc",
            limit_page_length=limit
        )
        
        return users
        
    except Exception as e:
        frappe.log_error(f"Error getting active users: {str(e)}")
        return []

@frappe.whitelist()
def is_user_assigned(doctype, docname, user=None):
    """Check if given user (default current session) is in _assign of document"""
    if not user:
        user = frappe.session.user

    # Administrator bypass
    if user == "Administrator":
        assigned = frappe.db.get_value(doctype, docname, "_assign")
        assigned_users = []
        
        if assigned:
            try:
                assigned_users = json.loads(assigned)
            except Exception:
                assigned_users = []
                
        return {"assigned": True, "all_assigned": assigned_users}

    # For regular users
    assigned = frappe.db.get_value(doctype, docname, "_assign")
    assigned_users = []
    
    if assigned:
        try:
            assigned_users = json.loads(assigned)
        except Exception:
            assigned_users = []

    return {"assigned": user in assigned_users, "all_assigned": assigned_users}

@frappe.whitelist()
def assign_doc_to_users(doctype, docname, users):
    """
    Add users to _assign field of any document
    """
    # Ensure we always have a list
    if isinstance(users, str):
        try:
            users = json.loads(users)
        except Exception:
            users = [u.strip() for u in users.split(",") if u.strip()]
    elif not isinstance(users, list):
        users = [users]

    # Get current assignment
    current_assign_json = frappe.db.get_value(doctype, docname, "_assign")
    current_assign = []
    
    if current_assign_json:
        try:
            current_assign = json.loads(current_assign_json)
        except Exception:
            current_assign = []

    # Find users to add (only those that exist and aren't already assigned)
    users_to_add = [
        u for u in users 
        if frappe.db.exists("User", u) and u not in current_assign
    ]
    
    if users_to_add:
        # Create new assignment and update
        new_assign = current_assign + users_to_add
        frappe.db.set_value(doctype, docname, "_assign", json.dumps(new_assign))
        frappe.db.commit()
        return {"assigned": new_assign, "added": users_to_add}
    else:
        return {"assigned": current_assign, "added": []}
    
@frappe.whitelist()
def remove_doc_assigned_user(doctype, docname, users):
    """
    Remove users from _assign field of any document
    Prevent users from removing themselves
    """
    # Ensure users is a list
    if isinstance(users, str):
        try:
            users = json.loads(users)
        except Exception:
            users = [u.strip() for u in users.split(",") if u.strip()]
    elif not isinstance(users, list):
        users = [users]

    # Check if user is trying to remove themselves
    current_user = frappe.session.user
    if current_user in users:
        frappe.throw(_("You cannot remove yourself from assignment. Please ask another assigned user or administrator to remove you."))
    
    # Get current assignment
    current_assign_json = frappe.db.get_value(doctype, docname, "_assign")
    current_assign = []
    
    if current_assign_json:
        try:
            current_assign = json.loads(current_assign_json)
        except Exception:
            current_assign = []

    # Remove users
    new_assign = [u for u in current_assign if u not in users]
    removed_users = [u for u in current_assign if u in users]
    
    if removed_users:
        # Update assignment
        frappe.db.set_value(doctype, docname, "_assign", json.dumps(new_assign))
        frappe.db.commit()

    return {"assigned": new_assign, "removed": removed_users}