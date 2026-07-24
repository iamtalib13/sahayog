# sahayog/api.py
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
            # Search in both name and full_name
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
def is_user_assigned(task_name, user=None):
    """Check if given user (default current session) is in _assign of Task"""
    if not user:
        user = frappe.session.user

    # Administrator bypass
    if user == "Administrator":
        # Get all assigned users for admin view - optimized query
        assigned = frappe.db.get_value("Task", task_name, "_assign")
        assigned_users = []
        
        if assigned:
            try:
                assigned_users = json.loads(assigned)
            except Exception:
                assigned_users = []
                
        return {"assigned": True, "all_assigned": assigned_users}

    # For regular users - optimized single query
    assigned = frappe.db.get_value("Task", task_name, "_assign")
    assigned_users = []
    
    if assigned:
        try:
            assigned_users = json.loads(assigned)
        except Exception:
            assigned_users = []

    return {"assigned": user in assigned_users, "all_assigned": assigned_users}

@frappe.whitelist()
def get_task_assignment_data(task_name, current_user):
    """Get all data needed for task assignment in a single API call"""
    try:
        # Get active users
        users = get_active_users_list()
        
        # Get assigned users
        assigned = frappe.db.get_value("Task", task_name, "_assign")
        assigned_users = []
        
        if assigned:
            try:
                assigned_users = json.loads(assigned)
            except Exception:
                assigned_users = []
        
        # Check if current user is assigned (for admin bypass)
        is_admin = current_user == "Administrator"
        is_assigned = current_user in assigned_users or is_admin
        
        return {
            "users": users,
            "assigned_users": assigned_users,
            "is_assigned": is_assigned,
            "is_admin": is_admin
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting task assignment data: {str(e)}")
        return {"users": [], "assigned_users": [], "is_assigned": False, "is_admin": False}

@frappe.whitelist()
def assign_task_to_users(task_name, users):
    """
    Add users to _assign field of Task - Optimized version
    """
    # Ensure we always have a list
    if isinstance(users, str):
        try:
            users = json.loads(users)
        except Exception:
            users = [u.strip() for u in users.split(",") if u.strip()]
    elif not isinstance(users, list):
        users = [users]

    # Get current assignment in a single query
    current_assign_json = frappe.db.get_value("Task", task_name, "_assign")
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
        frappe.db.set_value("Task", task_name, "_assign", json.dumps(new_assign))
        frappe.db.commit()
        return {"assigned": new_assign, "added": users_to_add}
    else:
        # No users to add, return current assignment
        return {"assigned": current_assign, "added": []}
    
@frappe.whitelist()
def remove_task_assigned_user(task_name, users):
    """
    Remove users from _assign field of Task - Optimized version
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
        # Prevent self-removal
        frappe.throw(_("You cannot remove yourself from task assignment. Please ask another assigned user or administrator to remove you."))
    
    # Get current assignment in a single query
    current_assign_json = frappe.db.get_value("Task", task_name, "_assign")
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
        frappe.db.set_value("Task", task_name, "_assign", json.dumps(new_assign))
        frappe.db.commit()

    return {"assigned": new_assign, "removed": removed_users}


@frappe.whitelist()
def get_assigned_task_count(user=None):
    """
    Get count of tasks where the user is in _assign field.
    Throws frappe exception if no task assigned.
    """
    if not user:
        user = frappe.session.user

    try:
        # Admin / Managers always have access
        allowed_roles = ["System Manager", "Task Manager", "Project Manager"]
        user_roles = frappe.get_roles(user)
        if any(role in allowed_roles for role in user_roles):
            return frappe.db.count('Task')  # All tasks

        # Count tasks where user is assigned
        count = frappe.db.count('Task', {
            '_assign': ['like', f'%"{user}"%']
        })

        if count == 0:
            frappe.throw("No tasks assigned to you")

        return count

    except Exception as e:
        frappe.log_error(f"Error getting assigned task count: {str(e)}")
        return 0

def has_cxo_access(user):
    """
    Checks if a user is authorized to view active sessions.
    Only Administrator or Employees with 'cxo_level' checked are allowed.
    """
    if user == "Administrator":
        return True
    return bool(frappe.db.get_value("Employee", {"user_id": user, "cxo_level": 1}))

@frappe.whitelist()
def check_cxo_access():
    """
    Whitelisted endpoint to check if the current session user has CXO level access.
    """
    return {"has_access": has_cxo_access(frappe.session.user)}

@frappe.whitelist()
def get_currently_logged_in_users():
    """
    Returns active logged-in users list and count.
    Accessible to all logged-in desk users who have CXO level access.
    """
    try:
        # Check authorization
        if not has_cxo_access(frappe.session.user):
            frappe.throw(_("You are not authorized to view active sessions."), frappe.PermissionError)

        # Fetch active sessions in the last 15 minutes, excluding Guest
        sessions = frappe.db.sql("""
            SELECT DISTINCT
                s.user as email,
                u.full_name,
                s.ipaddress,
                s.lastupdate
            FROM 
                `tabSessions` s
            LEFT JOIN 
                `tabUser` u ON s.user = u.name
            WHERE 
                s.user NOT IN ('Guest')
                AND s.lastupdate >= NOW() - INTERVAL 15 MINUTE
            ORDER BY 
                s.lastupdate DESC
        """, as_dict=True)
        
        # Unique list of logged in users
        unique_users = {}
        for session in sessions:
            email = session.get("email")
            if not email:
                continue
            if email not in unique_users:
                lastupdate_str = ""
                if session.get("lastupdate"):
                    try:
                        lastupdate_str = frappe.utils.format_datetime(session.get("lastupdate"), "hh:mm a")
                    except Exception:
                        pass
                
                unique_users[email] = {
                    "email": email,
                    "full_name": session.get("full_name") or email,
                    "ipaddress": session.get("ipaddress") or "",
                    "lastupdate": lastupdate_str
                }
        
        users_list = list(unique_users.values())
        
        return {
            "status": "success",
            "total_logged_in_users": len(users_list),
            "users": users_list
        }
    except Exception as e:
        frappe.log_error(f"Error in get_currently_logged_in_users: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }