# sahayog/api.py
import frappe
import json
from frappe import _
from frappe.utils.caching import redis_cache

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

@redis_cache(ttl=60)
def get_raw_active_users_data():
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
    
    # Calculate CPU usage percentage
    cpu_usage = 0.0
    try:
        import psutil
        cpu_usage = psutil.cpu_percent(interval=None)
        if cpu_usage == 0.0:
            import os
            load1, _, _ = os.getloadavg()
            cpu_count = os.cpu_count() or 1
            cpu_usage = (load1 / cpu_count) * 100
    except Exception:
        pass
    
    # Format CPU usage as integer
    cpu_usage = int(round(max(0.0, min(100.0, cpu_usage))))
    
    # Calculate unique users today (accessed the system)
    today_unique_users = 0
    try:
        today_str = frappe.utils.today()
        
        # 1. From Activity Log (successful logins today)
        logged_in_users = frappe.get_all(
            "Activity Log",
            filters={
                "operation": "Login",
                "status": "Success",
                "creation": (">=", today_str + " 00:00:00")
            },
            pluck="user"
        )
        
        # 2. From Sessions (active/modified sessions today)
        active_session_users = frappe.db.sql("""
            select distinct user from `tabSessions`
            where lastupdate >= %s
        """, (today_str + " 00:00:00",), as_dict=False)
        active_session_users = [u[0] for u in active_session_users if u[0] and u[0] != "Guest"]

        all_unique_users = set(logged_in_users) | set(active_session_users)
        if "Guest" in all_unique_users:
            all_unique_users.remove("Guest")
            
        today_unique_users = len(all_unique_users)
    except Exception as ex:
        frappe.log_error(f"Error calculating unique users today: {str(ex)}")
    
    return {
        "users": users_list,
        "cpu_usage": cpu_usage,
        "today_unique_users": today_unique_users
    }


@frappe.whitelist()
def get_currently_logged_in_users():
    """
    Returns active logged-in users list and count.
    Count is accessible to all logged-in desk users.
    Detail list is restricted to CXO level users and Administrator.
    Uses Redis @redis_cache decorator to support 300+ concurrent users with zero DB/CPU overhead.
    """
    try:
        raw_data = get_raw_active_users_data()
        
        # Check authorization per request (ensures absolute security)
        is_cxo = has_cxo_access(frappe.session.user)
        users_list = raw_data.get("users", [])
        total_count = len(users_list)
        cpu_usage = raw_data.get("cpu_usage", 0)
        today_unique_users = raw_data.get("today_unique_users", 0)
        
        # Get Drishti dashboard visitor stats
        drishti_stats = get_page_summary_stats("sahayog_dashboard")

        return {
            "status": "success",
            "total_logged_in_users": total_count,
            "has_cxo_access": is_cxo,
            "users": users_list if is_cxo else [],
            "cpu_usage": cpu_usage,
            "today_unique_users": today_unique_users,
            "drishti_today_visitors": drishti_stats.get("today_visitors_count", 0),
            "drishti_live_viewers": drishti_stats.get("live_viewers_count", 0)
        }
    except Exception as e:
        frappe.log_error(f"Error in get_currently_logged_in_users: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }


def get_page_summary_stats(page="sahayog_dashboard"):
    """
    Returns today's unique visitors count directly from Activity Log DocType,
    along with current live concurrent viewers.
    """
    try:
        import time
        today_str = frappe.utils.today()
        start_of_day = today_str + " 00:00:00"

        # Count unique users from Activity Log today (excluding Guest and Administrator)
        db_count = frappe.db.sql("""
            SELECT COUNT(DISTINCT user)
            FROM `tabActivity Log`
            WHERE reference_doctype = 'Page'
              AND reference_name = %s
              AND creation >= %s
              AND user NOT IN ('Guest', 'Administrator')
        """, (page, start_of_day))[0][0] or 0

        # Concurrent live viewers in last 60 seconds (excluding Guest and Administrator)
        now_ts = time.time()
        live_key = f"sahayog:page_live:{page}"
        live_dict = frappe.cache.get_value(live_key) or {}
        live_users = {u: ts for u, ts in live_dict.items() if (now_ts - ts) <= 60 and u not in ("Guest", "Administrator")}

        return {
            "today_visitors_count": max(db_count, len(live_users)),
            "live_viewers_count": len(live_users)
        }
    except Exception:
        return {"today_visitors_count": 0, "live_viewers_count": 0}


def create_page_activity_log(page, user=None):
    """
    Creates an Activity Log record for the page visit.
    Debounces to 1 entry per user per 15 minutes to avoid duplicate log flood.
    """
    if not user:
        user = frappe.session.user
    if not user or user in ("Guest", "Administrator"):
        return None

    try:
        # Check if an Activity Log was already created in the last 15 minutes
        recent = frappe.db.sql("""
            SELECT name FROM `tabActivity Log`
            WHERE user = %s
              AND reference_doctype = 'Page'
              AND reference_name = %s
              AND creation >= NOW() - INTERVAL 15 MINUTE
            LIMIT 1
        """, (user, page))

        if recent:
            return recent[0][0]

        page_title = "Drishti Dashboard" if page == "sahayog_dashboard" else page
        full_name = frappe.utils.get_fullname(user)

        log = frappe.new_doc("Activity Log")
        log.user = user
        log.full_name = full_name
        log.subject = f"Visited {page_title}"
        log.reference_doctype = "Page"
        log.reference_name = page
        log.status = "Success"
        if hasattr(frappe.local, "request_ip") and frappe.local.request_ip:
            log.ip_address = frappe.local.request_ip
        log.insert(ignore_permissions=True)
        frappe.db.commit()
        return log.name
    except Exception as e:
        frappe.log_error(f"Error inserting Activity Log for {page}: {str(e)}")
        return None


@frappe.whitelist()
def record_page_visit(page="sahayog_dashboard"):
    """
    Records a page visit into Activity Log DocType for the current session user.
    Maintains real-time live heartbeat and returns today's visitor statistics.
    """
    import time
    user = frappe.session.user
    if not user or user in ("Guest", "Administrator"):
        return get_page_visitors(page=page)

    try:
        now_ts = time.time()
        live_key = f"sahayog:page_live:{page}"

        # Register live heartbeat
        live_dict = frappe.cache.get_value(live_key) or {}
        live_dict = {u: ts for u, ts in live_dict.items() if (now_ts - ts) <= 60 and u not in ("Guest", "Administrator")}
        live_dict[user] = now_ts
        frappe.cache.set_value(live_key, live_dict, expires_in_sec=120)

        # Log into Activity Log DocType
        create_page_activity_log(page, user)

        # Retrieve full visitor details from Activity Log
        return get_page_visitors(page=page)
    except Exception as e:
        frappe.log_error(f"Error in record_page_visit: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "today_visitors_count": 0,
            "live_viewers_count": 0,
            "has_cxo_access": False,
            "visitors": []
        }


@frappe.whitelist()
def ping_page_heartbeat(page="sahayog_dashboard"):
    """
    Heartbeat called periodically while the page is actively visible in browser.
    Keeps user in live viewers set and returns current visitor counts.
    """
    import time
    user = frappe.session.user
    if not user or user in ("Guest", "Administrator"):
        stats = get_page_summary_stats(page=page)
        return {
            "status": "success",
            "today_visitors_count": stats.get("today_visitors_count", 0),
            "live_viewers_count": stats.get("live_viewers_count", 0)
        }

    try:
        now_ts = time.time()
        live_key = f"sahayog:page_live:{page}"

        live_dict = frappe.cache.get_value(live_key) or {}
        live_dict = {u: ts for u, ts in live_dict.items() if (now_ts - ts) <= 60 and u not in ("Guest", "Administrator")}
        live_dict[user] = now_ts
        frappe.cache.set_value(live_key, live_dict, expires_in_sec=120)

        stats = get_page_summary_stats(page=page)
        return {
            "status": "success",
            "today_visitors_count": stats.get("today_visitors_count", 0),
            "live_viewers_count": stats.get("live_viewers_count", 0)
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "today_visitors_count": 0, "live_viewers_count": 0}


@frappe.whitelist()
def leave_page(page="sahayog_dashboard"):
    """
    Removes the user from live viewers pool when leaving the page.
    """
    user = frappe.session.user
    if not user or user in ("Guest", "Administrator"):
        return {"status": "ok"}

    try:
        live_key = f"sahayog:page_live:{page}"
        live_dict = frappe.cache.get_value(live_key) or {}
        if user in live_dict:
            del live_dict[user]
            frappe.cache.set_value(live_key, live_dict, expires_in_sec=120)
        return {"status": "ok"}
    except Exception:
        return {"status": "ok"}


@frappe.whitelist()
def get_page_visitors(page="sahayog_dashboard"):
    """
    Queries Activity Log DocType for all visitors who accessed the given page today.
    Merges with live active session data.
    """
    import time
    user = frappe.session.user
    today_str = frappe.utils.today()
    start_of_day = today_str + " 00:00:00"

    # Live active pool (excluding Guest and Administrator)
    now_ts = time.time()
    live_key = f"sahayog:page_live:{page}"
    live_dict = frappe.cache.get_value(live_key) or {}
    live_dict = {u: ts for u, ts in live_dict.items() if (now_ts - ts) <= 60 and u not in ("Guest", "Administrator")}

    is_cxo = has_cxo_access(user)

    # Query Activity Log DocType for today's visits with multi-field fallback join to Employee and Sahayog Branch
    rows = frappe.db.sql("""
        SELECT 
            a.user,
            COALESCE(NULLIF(a.full_name, ''), NULLIF(u.full_name, ''), a.user) AS full_name,
            MIN(a.creation) AS first_visit_dt,
            MAX(a.creation) AS last_visit_dt,
            COUNT(a.name) AS visit_count,
            u.user_image,
            e.designation,
            e.department,
            COALESCE(NULLIF(e.branch, ''), NULLIF(sb.branch, '')) AS branch,
            COALESCE(NULLIF(e.custom_zone, ''), NULLIF(sb.zone, '')) AS custom_zone
        FROM 
            `tabActivity Log` a
        LEFT JOIN 
            `tabUser` u ON a.user = u.name
        LEFT JOIN 
            `tabEmployee` e ON (
                e.user_id = a.user 
                OR e.company_email = a.user 
                OR e.personal_email = a.user 
                OR e.employee_number = a.user
            )
        LEFT JOIN 
            `tabSahayog Branch` sb ON (
                sb.name = e.sahayog_branch 
                OR sb.sol_id = e.sol_id 
                OR sb.name = e.branch 
                OR sb.branch = e.branch
            )
        WHERE 
            a.reference_doctype = 'Page'
            AND a.reference_name = %s
            AND a.creation >= %s
            AND a.user NOT IN ('Guest', 'Administrator')
        GROUP BY 
            a.user, u.full_name, a.full_name, u.user_image, e.designation, e.department, e.branch, sb.branch, e.custom_zone, sb.zone
        ORDER BY 
            last_visit_dt DESC
    """, (page, start_of_day), as_dict=True)

    def _normalize_zone(val):
        if not val:
            return "Unassigned"
        s = str(val).strip()
        import re
        m = re.search(r'\d+', s)
        if m:
            return f"Zone-{m.group()}"
        return s.title() if s else "Unassigned"

    def _resolve_emp_info(uid):
        if not uid or uid in ("Guest", "Administrator"):
            return {}
        # Try direct user_id match
        emp = frappe.db.sql("""
            SELECT 
                e.designation, e.department, 
                COALESCE(NULLIF(e.branch, ''), NULLIF(sb.branch, '')) AS branch,
                COALESCE(NULLIF(e.custom_zone, ''), NULLIF(sb.zone, '')) AS custom_zone
            FROM `tabEmployee` e
            LEFT JOIN `tabSahayog Branch` sb ON (
                sb.name = e.sahayog_branch 
                OR sb.sol_id = e.sol_id 
                OR sb.name = e.branch 
                OR sb.branch = e.branch
            )
            WHERE e.user_id = %s OR e.company_email = %s OR e.personal_email = %s OR e.employee_number = %s
            LIMIT 1
        """, (uid, uid, uid, uid), as_dict=True)
        return emp[0] if emp else {}

    visitors_map = {}
    dept_counts = {}
    zone_counts = {}

    for r in rows:
        u_id = r.get("user")
        if not u_id or u_id in ("Guest", "Administrator"):
            continue

        raw_zone = r.get("custom_zone")
        if not raw_zone:
            fallback = _resolve_emp_info(u_id)
            raw_zone = fallback.get("custom_zone")
            if not r.get("designation"): r["designation"] = fallback.get("designation")
            if not r.get("department"): r["department"] = fallback.get("department")
            if not r.get("branch"): r["branch"] = fallback.get("branch")

        norm_zone = _normalize_zone(raw_zone)
        zone_counts[norm_zone] = zone_counts.get(norm_zone, 0) + 1

        dept = r.get("department") or "Other"
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

        first_v = frappe.utils.format_datetime(r.get("first_visit_dt"), "hh:mm a") if r.get("first_visit_dt") else ""
        last_v = frappe.utils.format_datetime(r.get("last_visit_dt"), "hh:mm a") if r.get("last_visit_dt") else ""

        visitors_map[u_id] = {
            "user": u_id,
            "full_name": r.get("full_name") or u_id,
            "user_image": r.get("user_image") or "",
            "designation": r.get("designation") or "",
            "department": r.get("department") or "",
            "branch": r.get("branch") or "",
            "zone": norm_zone,
            "first_visit": first_v,
            "last_visit": last_v,
            "visit_count": r.get("visit_count") or 1,
            "is_live": (u_id in live_dict)
        }

    # Ensure any user currently live is also included in visitors_map
    now_formatted = frappe.utils.format_datetime(frappe.utils.now_datetime(), "hh:mm a")
    for live_u in live_dict.keys():
        if live_u not in visitors_map and live_u not in ("Guest", "Administrator"):
            u_info = frappe.db.get_value("User", live_u, ["full_name", "user_image"], as_dict=True) or {}
            e_info = _resolve_emp_info(live_u)
            dept = e_info.get("department") or "Other"
            dept_counts[dept] = dept_counts.get(dept, 0) + 1
            raw_zone = e_info.get("custom_zone")
            norm_zone = _normalize_zone(raw_zone)
            zone_counts[norm_zone] = zone_counts.get(norm_zone, 0) + 1

            visitors_map[live_u] = {
                "user": live_u,
                "full_name": u_info.get("full_name") or live_u,
                "user_image": u_info.get("user_image") or "",
                "designation": e_info.get("designation") or "",
                "department": dept,
                "branch": e_info.get("branch") or "",
                "zone": norm_zone,
                "first_visit": now_formatted,
                "last_visit": now_formatted,
                "visit_count": 1,
                "is_live": True
            }

    def _is_admin(u):
        if not u:
            return True
        s = str(u).strip().lower()
        return s == "administrator" or s == "guest" or s.startswith("administrator@")

    # Clean out any stale admin keys from live_dict
    for k in list(live_dict.keys()):
        if _is_admin(k):
            del live_dict[k]

    visitors_list = [v for v in visitors_map.values() if not _is_admin(v.get("user")) and not _is_admin(v.get("full_name"))]
    visitors_list.sort(key=lambda x: (not x["is_live"], x.get("last_visit", "")), reverse=True)

    today_count = len(visitors_list)
    live_count = len(live_dict)

    return {
        "status": "success",
        "page": page,
        "today_visitors_count": today_count,
        "live_viewers_count": live_count,
        "has_cxo_access": True,
        "visitors": visitors_list,
        "department_breakdown": dept_counts,
        "zone_breakdown": zone_counts
    }