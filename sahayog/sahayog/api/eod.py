import frappe
import os
from frappe import _
from frappe.utils import nowdate, now_datetime, format_time, format_datetime, get_files_path, nowdate
from frappe.utils.file_manager import save_file
import json
from frappe.utils.pdf import get_pdf
from frappe.utils import format_time, format_date
from frappe.utils import cint

def get_user_fullname(user):
    """Helper to get user's full name."""
    if not user or user == "System":
        return "System"
    return frappe.db.get_value("User", user, "full_name") or user

def add_chat_message(eod_doc, text, sender="System", is_system=True, attachment=None):
    """Helper to add a message to the EOD chat."""
    eod_doc.append("chat_messages", {
        "sender": sender,
        "text": text or "",
        "attachment": attachment,
        "time": now_datetime(),
        "is_system": is_system
    })

# @frappe.whitelist()
# def get_eod_status():
#     """Returns the current EOD record and its status for today."""
#     today = nowdate()
#     eod = frappe.db.get_value("Bank EOD", {"date": today}, ["name", "status"], as_dict=True)
#     if eod:
#         return eod
#     return {"status": "idle"}


# # new working method
# @frappe.whitelist()
# def get_eod_status():
#     """Returns the current EOD record and its status for today."""
#     today = nowdate()
    
#     # ADDED "modified" to the list of fields to fetch from the database!
#     eod = frappe.db.get_value("Bank EOD", {"date": today}, ["name", "status", "modified"], as_dict=True)
    
#     if eod:
#         # If the status is Closed, send the modified time back to the frontend as 'closed_on'
#         if eod.status == "Closed":
#             eod["closed_on"] = str(eod.modified)
            
#         return eod
        
#     return {"status": "idle"}


from frappe.utils import nowdate

@frappe.whitelist()
def get_eod_status():
    """Returns the active EOD record. Enforces completion of the previous day's EOD."""
    today = nowdate()
    
    # 1. Fetch the absolute latest EOD document created in the system (ignoring the date)
    latest_eod = frappe.db.get_all(
        "Bank EOD", 
        fields=["name", "status", "modified", "date"], 
        order_by="date desc, creation desc", 
        limit=1
    )
    
    if latest_eod:
        eod = latest_eod[0]
        
        # 2. If the latest EOD is NOT closed (Pending/Completed), we MUST return it!
        # This traps the user in yesterday's EOD until they finish and close it.
        if eod.status != "Closed":
            return eod
            
        # 3. If the latest EOD IS Closed, and its date is today, return it (shows closed screen)
        if str(eod.date) == str(today):
            eod["closed_on"] = str(eod.modified)
            return eod
            
        # 4. If the latest EOD IS Closed, but it's from yesterday (or earlier), return idle!
        # This tells the frontend to show the "Start" button for a brand new day.
        return {"status": "idle"}
        
    # If no EODs exist at all in the database, return idle
    return {"status": "idle"}



@frappe.whitelist()
def start_eod():
    # --- ADD THIS SECURITY CHECK ---
    # Check if ANY previous EOD is still open (Not Closed)
    open_eods = frappe.db.get_all("Bank EOD", filters={"status": ("!=", "Closed")}, limit=1)
    
    if open_eods:
        # Block the creation of a new EOD and force a page refresh!
        frappe.throw("You cannot start a new EOD. Please complete and close the previous day's EOD first.")
    # --------------------------------

    """Creates a new Bank EOD record for today if it doesn't exist."""
    today = nowdate()
    
    # Check if any EOD exists for today
    existing_eod = frappe.db.get_value("Bank EOD", {"date": today}, ["name", "status"], as_dict=True)
    if existing_eod:
        return existing_eod
    
    eod = frappe.new_doc("Bank EOD")
    eod.date = today
    eod.status = "Pending"
    # load_tasks is called in before_insert in bank_eod.py
    eod.insert(ignore_permissions=True)
    
    # 1. Send "EOD started" message
    # current_dt = format_datetime(now_datetime(), "dd MMMM yyyy, hh:mm a")
    # add_chat_message(eod, f"EOD started for date {today} at {current_dt}")

    # # 2. Send first task initiation message
    # if eod.eod_tasks:
    #     sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))
    #     first_task = sorted_tasks[0]
    #     add_chat_message(eod, f"Task '{first_task.task}' (Team: {first_task.team}) initiated.")
    
    # eod.save(ignore_permissions=True)
    # frappe.db.commit()

    # return {"name": eod.name, "status": eod.status}

        # 1. Send "EOD started" message by the user who clicked Start
        # 1. Send "EOD started" message by the user who clicked Start
    current_dt = format_datetime(now_datetime(), "dd MMMM yyyy, hh:mm a")
    user_fullname = get_user_fullname(frappe.session.user)
    
    add_chat_message(
        eod, 
        f"EOD started for date {today} at {current_dt} by {user_fullname}", 
        sender=frappe.session.user, # <--- CRITICAL FIX: Pass the real user ID/Email here!
        is_system=False
    )
    
    # (Removed the "initiated" message logic completely)
    
    eod.save(ignore_permissions=True)
    frappe.db.commit()

    return {"name": eod.name, "status": eod.status} 


# @frappe.whitelist()
# def start_eod():
#     """Creates a new Bank EOD record for today if it doesn't exist."""
#     today = nowdate()
    
#     # Check if any EOD exists for today
#     existing_eod = frappe.db.get_value("Bank EOD", {"date": today}, ["name", "status"], as_dict=True)
#     if existing_eod:
#         return existing_eod
    
#     eod = frappe.new_doc("Bank EOD")
#     eod.date = today
#     eod.status = "Pending"
#     # load_tasks is called in before_insert in bank_eod.py
#     eod.insert(ignore_permissions=True)
    
#     # 1. Send "EOD started" message
#     current_dt = format_datetime(now_datetime(), "dd MMMM yyyy, hh:mm a")
#     add_chat_message(eod, f"EOD started for date {today} at {current_dt}")

#     # 2. Send first task initiation message
#     if eod.eod_tasks:
#         sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))
#         first_task = sorted_tasks[0]
#         add_chat_message(eod, f"Task '{first_task.task}' (Team: {first_task.team}) initiated.")
    
#     eod.save(ignore_permissions=True)
#     frappe.db.commit()

#     return {"name": eod.name, "status": eod.status}



# @frappe.whitelist()
# def get_eod_tasks(eod_name):
#     """Returns tasks for a given Bank EOD record, sorted by sequence."""
#     if not eod_name:
#         return []

#     eod = frappe.get_doc("Bank EOD", eod_name)
#     tasks = []

#     # Sort child table rows by sequence
#     sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))

#     for row in sorted_tasks:
#         tasks.append({
#             "name": row.name,
#             "team": row.team,
#             "sequence": row.sequence,
#             "task": row.task,
#             "status": row.status,
#             # FIXED: Now it sends the Full Name instead of the raw User ID (like "42")
#             "completed_by": get_user_fullname(row.completed_by) if row.completed_by else None,
#             "completed_on": row.completed_on,
#             "done": True if row.status == "Completed" else False
#         })

#     return tasks


@frappe.whitelist()
def get_eod_tasks(eod_name):
    """Returns tasks for a given Bank EOD record, sorted by sequence."""
    if not eod_name:
        return []

    eod = frappe.get_doc("Bank EOD", eod_name)
    tasks = []

    # Sort child table rows by sequence
    sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))

    for row in sorted_tasks:
        # Pre-fetch user image if completed
        user_image_url = None
        if row.completed_by:
            user_image_url = frappe.db.get_value("User", row.completed_by, "user_image")

        tasks.append({
            "name": row.name,
            "team": row.team,
            "sequence": row.sequence,
            "task": row.task,
            "status": row.status,
            "completed_by": get_user_fullname(row.completed_by) if row.completed_by else None,
            "completed_by_image": user_image_url, # <--- CRITICAL FIX: Send the image URL to Vue!
            "completed_on": row.completed_on,
            "done": True if row.status == "Completed" else False
        })

    return tasks


# @frappe.whitelist()
# def get_chat_messages(eod_name):
#     """Returns all chat messages for a given EOD session."""
#     if not eod_name:
#         return []
    
#     messages = frappe.get_all("EOD Chat Message", 
#         filters={"parent": eod_name}, 
#         fields=["name", "sender", "text", "attachment", "time", "is_system"],
#         order_by="time asc"
#     )
    
#     for msg in messages:
#         msg["is_me"] = (msg["sender"] == frappe.session.user and not msg["is_system"])
#         msg["sender_name"] = "System" if msg["is_system"] else get_user_fullname(msg["sender"])
#         msg["time_display"] = format_time(msg["time"], "HH:mm") if msg["time"] else ""
        
#         if msg["attachment"]:
#             msg["is_image"] = any(msg["attachment"].lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"])
#             msg["file_name"] = msg["attachment"].split("/")[-1]
    
#     return messages


@frappe.whitelist()
def get_chat_messages(eod_name):
    eod = frappe.get_doc("Bank EOD", eod_name)
    messages = []

    for msg in eod.get("chat_messages", []):
        sender_value = msg.sender or "System"

        # if msg.is_system or sender_value == "System":
        #     sender_name = "System"
        #     user_image = None
        # else:
        #     sender_name = get_user_fullname(sender_value)
        #     user_image = frappe.db.get_value("User", sender_value, "user_image")

        if msg.is_system or sender_value == "System":
            sender_name = "System"
            user_image = None
        else:
            sender_name = get_user_fullname(sender_value)
            user_image = frappe.db.get_value("User", sender_value, "user_image") # <--- Works if sender is an ID!

        is_me = sender_value == frappe.session.user

        is_image = False
        file_name = None
        if msg.attachment:
            file_name = msg.attachment.split("/")[-1]
            ext = file_name.split(".")[-1].lower() if "." in file_name else ""
            if ext in ["jpg", "jpeg", "png", "gif", "webp", "svg"]:
                is_image = True

        messages.append({
            "name": msg.name,
            "sender": sender_value,          # actual user id/email if needed internally
            "sender_name": sender_name,      # full name for UI
            "text": msg.text,
            "attachment": msg.attachment,
            "is_image": is_image,
            "file_name": file_name,
            "time_display": format_time(msg.time, "hh:mm a"),
            "is_me": is_me,
            "is_system": msg.is_system,
            "user_image": user_image
        })

    return messages

@frappe.whitelist(methods=["GET", "POST"])
def send_chat_message(eod_name, text=None, attachment=None):
    """API to send a manual chat message."""
    if not eod_name or (not text and not attachment):
        return {"status": "error", "message": "Missing arguments"}
    
    try:
        eod = frappe.get_doc("Bank EOD", eod_name)
        if eod.status == "Closed":
            return {"status": "error", "message": "EOD process is closed"}

        add_chat_message(eod, text, sender=frappe.session.user, is_system=False, attachment=attachment)
        eod.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {"status": "success"}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "EOD Chat Error")
        return {"status": "error", "message": str(e)}

@frappe.whitelist(methods=["POST"])
def upload_file():
    """Custom upload handler for EOD chat."""
    if "file" not in frappe.request.files:
        return {"status": "error", "message": "No file uploaded"}
    
    file = frappe.request.files["file"]
    eod_name = frappe.form_dict.get("eod_name")
    
    try:
        dt = "Bank EOD" if eod_name else "User"
        dn = eod_name if eod_name else frappe.session.user
        
        saved_file = save_file(file.filename, file.read(), dt, dn, is_private=0)
        return {
            "status": "success",
            "file_url": saved_file.file_url,
            "file_name": saved_file.file_name
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "EOD File Upload Error")
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def get_token():
    """Returns a fresh CSRF token."""
    return frappe.sessions.get_csrf_token()

@frappe.whitelist(methods=["GET", "POST"])
def close_eod(eod_name):
    """Sets the Bank EOD status to 'Closed'."""
    eod = frappe.get_doc("Bank EOD", eod_name)
    
    if eod.status == "Closed":
        return {"status": "success", "eod_status": "Closed"}

    # Verify all tasks are done before closing
    all_done = all(r.status == "Completed" for r in eod.eod_tasks)
    if not all_done:
        frappe.throw(_("Cannot close EOD. Some tasks are still pending."))
        
    # # Manual transition to Closed
    # eod.status = "Closed"
    # add_chat_message(eod, "EOD process closed for today.")

        # Manual transition to Closed
    # eod.status = "Closed"
    # user_fullname = get_user_fullname(frappe.session.user)
    
    # add_chat_message(
    #     eod, 
    #     f"EOD process successfully closed and locked.", 
    #     sender=user_fullname, 
    #     is_system=False
    # )
    
    # eod.save(ignore_permissions=True)
    # frappe.db.commit()

        # Manual transition to Closed
    eod.status = "Closed"
    user_fullname = get_user_fullname(frappe.session.user)
    
    add_chat_message(
        eod, 
        f"EOD process successfully closed and locked by {user_fullname}.", 
        sender=frappe.session.user,  # <--- CRITICAL FIX: Pass the ID, not fullname
        is_system=False
    )
    
    eod.save(ignore_permissions=True)
    frappe.db.commit()
    # return {"status": "success", "eod_status": eod.status}
    return {
    "status": "success",
    "eod_status": "Closed",
    "eod_date": str(eod.date),
    "closed_on": str(eod.modified)
}


@frappe.whitelist(methods=["GET", "POST"])
def update_task_status(eod_name, task_row_name, done):
    """Updates the status of a specific task in Bank EOD."""
    # Convert 'true'/'false' strings to boolean if sent via GET
    if isinstance(done, str):
        done = done.lower() == 'true'

    eod = frappe.get_doc("Bank EOD", eod_name)
    
    if eod.status == "Closed":
        frappe.throw(_("Cannot update task status. EOD process for {0} is already closed.").format(eod.date))

    updated = False
    sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))
    
    for i, row in enumerate(sorted_tasks):
        if row.name == task_row_name:
            
            # --- START OF NEW PERMISSION CHECK ---
            if frappe.session.user != "Administrator":
                is_member = frappe.db.exists("Team Members", {"parent": row.team, "user": frappe.session.user})
                
                # Check if user is the team lead (Optional: assuming you have a team_lead field in EOD Team)
                is_lead = False 
                if frappe.get_meta("EOD Team").has_field("team_lead"):
                    is_lead = frappe.db.exists("EOD Team", {"name": row.team, "team_lead": frappe.session.user})
                
                if not (is_member or is_lead):
                    return {"status": "error", "message": f"Permission denied. You are not a member of the {row.team} team."}
            # --- END OF NEW PERMISSION CHECK ---

            prev_status = row.status
            # --- NEW SECURITY RESTRICTION ---
            # If a user is trying to uncheck (done is False) a completed task, verify they are the owner
            # if not done and prev_status == "Completed":
            #     if row.completed_by and row.completed_by != frappe.session.user:
            #         # Returns an error which triggers your Vue.js Access Denied Modal!
            #         return {
            #             "status": "error", 
            #             "message": "Access Denied: Only the team member who checked this task is allowed to uncheck it."
            #         }
            # --------------------------------

            # --- SECURITY RESTRICTION WITH ADMIN OVERRIDE ---
            # If trying to uncheck, verify they are the owner OR the Administrator
            if not done and prev_status == "Completed":
                if row.completed_by and row.completed_by != frappe.session.user and frappe.session.user != "Administrator":
                    return {
                        "status": "error", 
                        "message": "Access Denied: Only the team member who checked this task is allowed to uncheck it."
                    }
            # ------------------------------------------------
            row.status = "Completed" if done else "Pending"
            
            # if done and prev_status != "Completed":
            #     row.completed_by = frappe.session.user
            #     row.completed_on = now_datetime()
            #     user_fullname = get_user_fullname(frappe.session.user)
            #     add_chat_message(eod, f"Task '{row.task}' (Team: {row.team}) completed by {user_fullname}.")
                
            #     if i + 1 < len(sorted_tasks):
            #         next_task = sorted_tasks[i+1]
            #         add_chat_message(eod, f"Task '{next_task.task}' (Team: {next_task.team}) initiated.")
            
            # elif not done and prev_status == "Completed":
            #     row.completed_by = None
            #     row.completed_on = None
            #     add_chat_message(eod, f"Task '{row.task}' (Team: {row.team}) set back to Pending.")

            # if done and prev_status != "Completed":
            #     row.completed_by = frappe.session.user
            #     row.completed_on = now_datetime()
            #     user_fullname = get_user_fullname(frappe.session.user)
                
            #     # Send completed message as the user
            #     add_chat_message(
            #         eod, 
            #         f"Task '{row.task}' (Team: {row.team}) completed.", 
            #         sender=user_fullname, 
            #         is_system=False
            #     )
                
            #     # (Removed the next task "initiated" logic)
            
            # elif not done and prev_status == "Completed":
            #     row.completed_by = None
            #     row.completed_on = None
            #     user_fullname = get_user_fullname(frappe.session.user)
                
            #     # Send unchecked message as the user
            #     user_fullname = get_user_fullname(frappe.session.user)
            #     # CRITICAL FIX: sender=frappe.session.user, not user_fullname!
            #     add_chat_message(
            #         eod, 
            #         f"Task '{row.task}' (Team: {row.team}) completed by {user_fullname}.",
            #         sender=frappe.session.user, 
            #         is_system=False
            #     )

            if done and prev_status != "Completed":
                row.completed_by = frappe.session.user
                row.completed_on = now_datetime()
                user_fullname = get_user_fullname(frappe.session.user)
                
                # Send completed message as the user
                add_chat_message(
                    eod, 
                    f"Task '{row.task}' (Team: {row.team}) completed.", 
                    sender=frappe.session.user, # <--- CRITICAL FIX: Pass the ID, not fullname
                    is_system=False
                )
                
            elif not done and prev_status == "Completed":
                row.completed_by = None
                row.completed_on = None
                user_fullname = get_user_fullname(frappe.session.user)
                
                # Send unchecked message as the user
                add_chat_message(
                    eod, 
                    f"Task '{row.task}' (Team: {row.team}) unchecked by {user_fullname}.",
                    sender=frappe.session.user, # <--- Already correct here
                    is_system=False
                )
                
            updated = True
            break
            
    if updated:
        eod.save(ignore_permissions=True)
        frappe.db.commit()
        return {"status": "success", "eod_status": eod.status}
        
    return {"status": "error", "message": "Task not found"}






# @frappe.whitelist()
# def check_eod_access():
#     """Checks roles and returns access flags."""
#     user = frappe.session.user
#     roles = frappe.get_roles(user)
    
#     # Absolute override for Admin / System Manager
#     if user == "Administrator" or "System Manager" in roles:
#         return {"has_access": True, "is_manager": True}
        
#     return {
#         "has_access": "EOD Checklist Manager" in roles or "EOD Checklist Member" in roles,
#         "is_manager": "EOD Checklist Manager" in roles
#     }

@frappe.whitelist()
def check_eod_access():
    """Checks roles and returns access flags."""
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    # Absolute override for Admin / System Manager
    if user == "Administrator" or "System Manager" in roles:
        return {"has_access": True, "is_manager": True, "is_viewer": False}
        
    has_member_access = "EOD Checklist Manager" in roles or "EOD Checklist Member" in roles
    is_viewer = "EOD Checklist Viewer" in roles
    
    # If they are ONLY a viewer (no manager or member roles), mark them as strict viewer
    strict_viewer = is_viewer and not has_member_access

    return {
        # They have access if they have ANY of the three roles
        "has_access": has_member_access or is_viewer,
        "is_manager": "EOD Checklist Manager" in roles,
        "is_viewer": strict_viewer
    }



# @frappe.whitelist()
# def get_manager_data():
#     """Gets the team and active checklist. Safely handles Admin access."""
#     user = frappe.session.user
#     roles = frappe.get_roles(user)
#     is_admin = (user == "Administrator" or "System Manager" in roles)
    
#     team_name = frappe.form_dict.get("team_name")
#     if team_name in ["null", "undefined", "", "[object MouseEvent]", "None"]:
#         team_name = None
        
#     if not team_name:
#         team_name = frappe.db.get_value("EOD Team", {"team_lead": user}, "name")
        
#     if not team_name:
#         if is_admin:
#             all_teams = frappe.get_all("EOD Team", fields=["name"])
#             return {"status": "admin_select", "teams": all_teams}
#         else:
#             return {"status": "error", "message": "You are not assigned as a team lead."}
            
#     if not frappe.db.exists("EOD Team", team_name):
#         return {"status": "error", "message": f"Team '{team_name}' does not exist."}
        
#     team_doc = frappe.get_doc("EOD Team", team_name)
#     members = [{"user": m.user} for m in team_doc.get("team_members", []) if m.user]
    
#     checklist_name = frappe.db.get_value("EOD Checklist", {"team": team_name, "is_active": 1}, "name")
#     tasks = []
    
#     if checklist_name:
#         chk_doc = frappe.get_doc("EOD Checklist", checklist_name)
#         tasks = [{"task": t.task, "sequence": t.sequence or t.idx} for t in chk_doc.get("checklist_items", [])]

#     # --- FETCH ALL ACTIVE USERS ---
#     system_users = frappe.get_all(
#         "User", 
#         filters={"enabled": 1, "user_type": "System User"}, 
#         fields=["name", "full_name"]
#     )
        
#     return {
#         "status": "success",
#         "team_name": team_name,
#         "checklist_name": checklist_name,
#         "members": members,
#         "tasks": sorted(tasks, key=lambda x: int(x.get("sequence") or 0)),
#         "system_users": system_users
#     }



# @frappe.whitelist(methods=["POST"])
# def save_manager_data():
#     """Saves the updated team members and checklist tasks without triggering 403s."""
#     # Capture the actual logged-in user
#     original_user = frappe.session.user
    
#     try:
#         team_name = frappe.form_dict.get("team_name")
#         checklist_name = frappe.form_dict.get("checklist_name")
#         members = json.loads(frappe.form_dict.get("members", "[]"))
#         tasks = json.loads(frappe.form_dict.get("tasks", "[]"))
        
#         # 1. SECURITY VALIDATION: Check if caller is Admin or Team Lead
#         roles = frappe.get_roles(original_user)
#         is_admin = (original_user == "Administrator" or "System Manager" in roles)
        
#         # Use ignore_permissions just to read the Team Lead field safely
#         frappe.flags.ignore_permissions = True
#         team_lead = frappe.db.get_value("EOD Team", team_name, "team_lead")
        
#         if not is_admin:
#             if not team_lead or str(team_lead).lower() != str(original_user).lower():
#                 return {"status": "error", "message": "Permission Denied: You are not the Team Lead for this team."}

#         # =====================================================================
#         # 2. THE FIX: Temporarily become 'Administrator' to completely bypass 
#         # Frappe's strict 403 doc and child-table save restrictions.
#         # =====================================================================
#         frappe.set_user("Administrator")
        
#         # 3. Update Team Members
#         team_doc = frappe.get_doc("EOD Team", team_name)
#         team_doc.set("team_members", [])
#         for m in members:
#             if m.get("user"):
#                 team_doc.append("team_members", {"user": m.get("user")})
#         team_doc.save(ignore_permissions=True)
        
#         # 4. Update Checklist Tasks
#         if checklist_name:
#             chk_doc = frappe.get_doc("EOD Checklist", checklist_name)
#             chk_doc.set("checklist_items", [])
#             for t in tasks:
#                 if t.get("task"):
#                     chk_doc.append("checklist_items", {
#                         "task": t.get("task"),
#                         "sequence": t.get("sequence")
#                     })
#             chk_doc.save(ignore_permissions=True)
            
#         frappe.db.commit()
#         return {"status": "success"}
        
#     except frappe.exceptions.ValidationError as e:
#         frappe.db.rollback()
#         return {"status": "error", "message": f"Validation Error: {str(e)}"}
#     except Exception as e:
#         frappe.db.rollback()
#         frappe.log_error(frappe.get_traceback(), "EOD Save Manager Data Error")
#         return {"status": "error", "message": f"System Error: {str(e)}"}
        
#     finally:
#         # 5. VERY IMPORTANT: Always revert the session back to the original user
#         # so the Manager doesn't stay an Admin for other requests!
#         frappe.set_user(original_user)
#         frappe.flags.ignore_permissions = False




@frappe.whitelist()
def get_manager_data():
    """Gets the team and active checklist. Safely handles Admin access."""
    user = frappe.session.user
    roles = frappe.get_roles(user)
    is_admin = (user == "Administrator" or "System Manager" in roles)
    
    team_name = frappe.form_dict.get("team_name")
    if team_name in ["null", "undefined", "", "[object MouseEvent]", "None"]:
        team_name = None
        
    if not team_name:
        team_name = frappe.db.get_value("EOD Team", {"team_lead": user}, "name")
        
    if not team_name:
        if is_admin:
            all_teams = frappe.get_all("EOD Team", fields=["name"])
            return {"status": "admin_select", "teams": all_teams}
        else:
            return {"status": "error", "message": "You are not assigned as a team lead."}
            
    if not frappe.db.exists("EOD Team", team_name):
        return {"status": "error", "message": f"Team '{team_name}' does not exist."}
        
    team_doc = frappe.get_doc("EOD Team", team_name)
    members = [{"user": m.user} for m in team_doc.get("team_members", []) if m.user]
    
    # NEW FIX: Remove 'is_active: 1' from the filter here so managers can still open 
    # the modal and see the checklist even if it is currently inactive!
    checklist_name = frappe.db.get_value("EOD Checklist", {"team": team_name}, "name")
    tasks = []
    
    if checklist_name:
        chk_doc = frappe.get_doc("EOD Checklist", checklist_name)
        tasks = [{"task": t.task, "sequence": t.sequence or t.idx} for t in chk_doc.get("checklist_items", [])]

    # --- FETCH ALL ACTIVE USERS ---
    system_users = frappe.get_all(
        "User", 
        filters={"enabled": 1, "user_type": "System User"}, 
        fields=["name", "full_name"]
    )
        
    return {
        "status": "success",
        "team_name": team_name,
        "checklist_name": checklist_name,
        # NEW FIX: Send the team's is_active status back to the frontend checkbox
        "is_active": getattr(team_doc, "is_active", 1), 
        "members": members,
        "tasks": sorted(tasks, key=lambda x: int(x.get("sequence") or 0)),
        "system_users": system_users
    }


@frappe.whitelist(methods=["POST"])
def save_manager_data():
    """Saves the updated team members, checklist tasks, and active status without triggering 403s."""
    # Capture the actual logged-in user
    original_user = frappe.session.user
    
    try:
        team_name = frappe.form_dict.get("team_name")
        checklist_name = frappe.form_dict.get("checklist_name")
        
        # NEW FIX: Safely capture the is_active checkbox value from the frontend
        is_active = int(frappe.form_dict.get("is_active", 1))
        
        members = json.loads(frappe.form_dict.get("members", "[]"))
        tasks = json.loads(frappe.form_dict.get("tasks", "[]"))
        
        # 1. SECURITY VALIDATION: Check if caller is Admin or Team Lead
        roles = frappe.get_roles(original_user)
        is_admin = (original_user == "Administrator" or "System Manager" in roles)
        
        # Use ignore_permissions just to read the Team Lead field safely
        frappe.flags.ignore_permissions = True
        team_lead = frappe.db.get_value("EOD Team", team_name, "team_lead")
        
        if not is_admin:
            if not team_lead or str(team_lead).lower() != str(original_user).lower():
                return {"status": "error", "message": "Permission Denied: You are not the Team Lead for this team."}

        # =====================================================================
        # 2. THE FIX: Temporarily become 'Administrator' to completely bypass 
        # Frappe's strict 403 doc and child-table save restrictions.
        # =====================================================================
        frappe.set_user("Administrator")
        
        # 3. Update Team Members & Active Status
        team_doc = frappe.get_doc("EOD Team", team_name)
        
        # NEW FIX: Apply the is_active checkbox value to the EOD Team document
        if hasattr(team_doc, "is_active"):
            team_doc.is_active = is_active
            
        team_doc.set("team_members", [])
        for m in members:
            if m.get("user"):
                team_doc.append("team_members", {"user": m.get("user")})
        team_doc.save(ignore_permissions=True)
        
        # 4. Update Checklist Tasks & Active Status
        if checklist_name:
            chk_doc = frappe.get_doc("EOD Checklist", checklist_name)
            
            # NEW FIX: Apply the same is_active checkbox value to the Checklist document
            if hasattr(chk_doc, "is_active"):
                chk_doc.is_active = is_active
                
            chk_doc.set("checklist_items", [])
            for t in tasks:
                if t.get("task"):
                    chk_doc.append("checklist_items", {
                        "task": t.get("task"),
                        "sequence": t.get("sequence")
                    })
            chk_doc.save(ignore_permissions=True)
            
        frappe.db.commit()
        return {"status": "success"}
        
    except frappe.exceptions.ValidationError as e:
        frappe.db.rollback()
        return {"status": "error", "message": f"Validation Error: {str(e)}"}
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "EOD Save Manager Data Error")
        return {"status": "error", "message": f"System Error: {str(e)}"}
        
    finally:
        # 5. VERY IMPORTANT: Always revert the session back to the original user
        # so the Manager doesn't stay an Admin for other requests!
        frappe.set_user(original_user)
        frappe.flags.ignore_permissions = False



# @frappe.whitelist()
# def download_eod_report(eod_name):
#     """Generates and downloads a complete Audit PDF Report for the EOD."""
#     if not eod_name:
#         return
        
#     eod = frappe.get_doc("Bank EOD", eod_name)
#     sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))
    
#     chat_messages = frappe.get_all("EOD Chat Message", 
#         filters={"parent": eod_name}, 
#         fields=["sender", "text", "time", "is_system", "attachment"],
#         order_by="time asc"
#     )

#     # Build a clean HTML template for the PDF
#     html = f"""
#     <html>
#     <head>
#         <style>
#             body {{ font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #1a1d21; }}
#             h1 {{ text-align: center; color: #1a1d21; margin-bottom: 20px; }}
#             h2 {{ color: #00b09b; border-bottom: 1px solid #eef1f4; padding-bottom: 5px; margin-top: 30px; }}
#             table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
#             th, td {{ border: 1px solid #d1d5db; padding: 10px; text-align: left; }}
#             th {{ background-color: #f8f9fb; font-weight: bold; font-size: 11px; text-transform: uppercase; }}
#             .status-Completed {{ color: #16a34a; font-weight: bold; }}
#             .status-Pending {{ color: #ea580c; font-weight: bold; }}
#             .chat-msg {{ margin-bottom: 10px; padding: 12px; background: #f8f9fb; border-radius: 8px; border: 1px solid #eef1f4; }}
#             .chat-meta {{ font-size: 11px; color: #707991; margin-bottom: 4px; font-weight: bold; }}
#         </style>
#     </head>
#     <body>
#         <h1>End of Day (EOD) Audit Report</h1>
#         <table>
#             <tr>
#                 <th>EOD Reference</th><td>{eod.name}</td>
#                 <th>Date</th><td>{format_date(eod.date)}</td>
#             </tr>
#             <tr>
#                 <th>Final Status</th><td>{eod.status}</td>
#                 <th>Project/Branch</th><td>{getattr(eod, 'subtitle', 'N/A')}</td>
#             </tr>
#         </table>

#         <h2>1. Checklist Execution Log</h2>
#         <table>
#             <thead>
#                 <tr>
#                     <th>Seq</th>
#                     <th>Team</th>
#                     <th>Task Description</th>
#                     <th>Status</th>
#                     <th>Completed By</th>
#                     <th>Time</th>
#                 </tr>
#             </thead>
#             <tbody>
#     """
    
#     # Inject Checklist Rows
#     for t in sorted_tasks:
#         c_by = get_user_fullname(t.completed_by) if t.completed_by else ""
#         c_time = format_time(t.completed_on, "HH:mm:ss") if t.completed_on else ""
#         html += f"""
#                 <tr>
#                     <td>{t.sequence or ''}</td>
#                     <td>{t.team or ''}</td>
#                     <td>{t.task or ''}</td>
#                     <td class="status-{t.status}">{t.status}</td>
#                     <td>{c_by}</td>
#                     <td>{c_time}</td>
#                 </tr>
#         """
        
#     html += """
#             </tbody>
#         </table>
        
#         <h2>2. System & Group Chat Transcript</h2>
#     """
    
#     # Inject Chat Messages
#     if not chat_messages:
#         html += "<p>No chat messages or system logs recorded.</p>"
#     else:
#         for msg in chat_messages:
#             sender_name = "EOD System" if msg.is_system else get_user_fullname(msg.sender)
#             msg_time = format_time(msg.time, "HH:mm:ss") if msg.time else ""
#             text = msg.text or (f"[Attachment: {msg.attachment}]" if msg.attachment else "")
            
#             html += f"""
#             <div class="chat-msg">
#                 <div class="chat-meta">{sender_name} &bull; {msg_time}</div>
#                 <div>{text}</div>
#             </div>
#             """
            
#     html += """
#     </body>
#     </html>
#     """
    
#     # Tell Frappe to return a downloadable PDF file
#     frappe.local.response.filename = f"EOD_Audit_{eod_name}.pdf"
#     frappe.local.response.filecontent = get_pdf(html)
#     frappe.local.response.type = "pdf"




import frappe
from frappe.utils import cint

@frappe.whitelist()
def download_eod_report(eod_name, include_chat=1):
    """Generates and downloads a complete Audit PDF Report for the EOD."""
    if not eod_name:
        return
        
    # Safely convert '0' or '1' from the Javascript URL into an integer
    include_chat = cint(include_chat)
        
    eod = frappe.get_doc("Bank EOD", eod_name)
    sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))
    
    # Build a clean HTML template for the PDF
    html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #1a1d21; }}
            h1 {{ text-align: center; color: #1a1d21; margin-bottom: 20px; }}
            h2 {{ color: #00b09b; border-bottom: 1px solid #eef1f4; padding-bottom: 5px; margin-top: 30px; }}
            table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
            th, td {{ border: 1px solid #d1d5db; padding: 10px; text-align: left; }}
            th {{ background-color: #f8f9fb; font-weight: bold; font-size: 11px; text-transform: uppercase; }}
            .status-Completed {{ color: #16a34a; font-weight: bold; }}
            .status-Pending {{ color: #ea580c; font-weight: bold; }}
            .chat-msg {{ margin-bottom: 10px; padding: 12px; background: #f8f9fb; border-radius: 8px; border: 1px solid #eef1f4; }}
            .chat-meta {{ font-size: 11px; color: #707991; margin-bottom: 4px; font-weight: bold; }}
        </style>
    </head>
    <body>
        <h1>End of Day (EOD) Audit Report</h1>
        <table>
            <tr>
                <th>EOD Reference</th><td>{eod.name}</td>
                <th>Date</th><td>{format_date(eod.date)}</td>
            </tr>
            <tr>
                <th>Final Status</th><td>{eod.status}</td>
                <th>Project/Branch</th><td>{getattr(eod, 'subtitle', 'N/A')}</td>
            </tr>
        </table>

        <h2>1. Checklist Execution Log</h2>
        <table>
            <thead>
                <tr>
                    <th>Seq</th>
                    <th>Team</th>
                    <th>Task Description</th>
                    <th>Status</th>
                    <th>Completed By</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
    """
    
    # Inject Checklist Rows
    for t in sorted_tasks:
        c_by = get_user_fullname(t.completed_by) if t.completed_by else ""
        c_time = format_time(t.completed_on, "HH:mm:ss") if t.completed_on else ""
        html += f"""
                <tr>
                    <td>{t.sequence or ''}</td>
                    <td>{t.team or ''}</td>
                    <td>{t.task or ''}</td>
                    <td class="status-{t.status}">{t.status}</td>
                    <td>{c_by}</td>
                    <td>{c_time}</td>
                </tr>
        """
        
    html += """
            </tbody>
        </table>
    """
    
    # =========================================================================
    # THE MAGIC FIX: Only fetch chat messages and add them to HTML if include_chat == 1
    # =========================================================================
    if include_chat == 1:
        
        chat_messages = frappe.get_all("EOD Chat Message", 
            filters={"parent": eod_name}, 
            fields=["sender", "text", "time", "is_system", "attachment"],
            order_by="time asc"
        )
        
        html += """
        <h2>2. System & Group Chat Transcript</h2>
        """
        
        # Inject Chat Messages
        if not chat_messages:
            html += "<p>No chat messages or system logs recorded.</p>"
        else:
            for msg in chat_messages:
                sender_name = "EOD System" if msg.is_system else get_user_fullname(msg.sender)
                msg_time = format_time(msg.time, "HH:mm:ss") if msg.time else ""
                text = msg.text or (f"[Attachment: {msg.attachment}]" if msg.attachment else "")
                
                html += f"""
                <div class="chat-msg">
                    <div class="chat-meta">{sender_name} &bull; {msg_time}</div>
                    <div>{text}</div>
                </div>
                """
                
    # Close the HTML document regardless of whether chat was included
    html += """
    </body>
    </html>
    """
    
    # Tell Frappe to return a downloadable PDF file
    frappe.local.response.filename = f"EOD_Audit_{eod_name}.pdf"
    frappe.local.response.filecontent = get_pdf(html)
    frappe.local.response.type = "pdf"


from frappe.utils import nowdate

# @frappe.whitelist()
# def check_and_notify_inactive_teams():
#     """Runs at a scheduled time to alert specific team managers if their team hasn't started tasks."""
#     today = nowdate()
    
#     # 1. Find today's EOD record that is Started (Pending)
#     eod_records = frappe.get_all("Bank EOD", filters={"date": today, "status": "Pending"}, limit=1)
#     if not eod_records:
#         return "No active EOD found for today."
        
#     eod = frappe.get_doc("Bank EOD", eod_records[0].name)
    
#     # 2. Analyze task completion per team
#     team_status = {}
#     for row in eod.eod_tasks:
#         if row.team not in team_status:
#             team_status[row.team] = {"total": 0, "completed": 0}
        
#         team_status[row.team]["total"] += 1
#         if row.status == "Completed":
#             team_status[row.team]["completed"] += 1
            
#     notified_teams = []

#     # 3. Check each team and send targeted emails to their managers
#     for team_name, stats in team_status.items():
#         if stats["total"] > 0 and stats["completed"] == 0:
            
#             # Fetch the manager emails specifically for THIS team
#             manager_emails_raw = frappe.db.get_value("EOD Team", team_name, "manager_emails")
            
#             if manager_emails_raw:
#                 # Split by comma to support single or multiple emails safely
#                 email_list = [e.strip() for e in manager_emails_raw.split(",") if e.strip()]
                
#                 if email_list:
#                     subject = f"⚠️ Action Required: No EOD Tasks Completed for Team {team_name}"
#                     message = f"""
#                     <div style="font-family: Arial, sans-serif; color: #333;">
#                         <h2 style="color: #ef4444;">EOD Checklist Alert</h2>
#                         <p>The EOD process for <b>{today}</b> is currently running, but your team (<b>{team_name}</b>) has not completed a single task yet.</p>
#                         <p>Please follow up with your team members to ensure the EOD tasks are completed on time before the cutoff.</p>
#                         <br>
#                         <p><i>This is an automated message from the Sahayog EOD System.</i></p>
#                     </div>
#                     """
                    
#                     # Send the targeted email (REMOVED now=True so it goes to Email Queue)
#                     frappe.sendmail(
#                         recipients=email_list,
#                         subject=subject,
#                         message=message
#                     )
#                     notified_teams.append(team_name)

#     # 4. Optional: Log a single message in the EOD Chat summarizing who was alerted
#     if notified_teams:
#         teams_str = ", ".join(notified_teams)
        
#         add_chat_message(
#             eod, 
#             f"System Alert: Managers for the following inactive teams have been notified via email: {teams_str}.", 
#             sender="System", 
#             is_system=True
#         )
#         eod.save(ignore_permissions=True)
#         frappe.db.commit()
        
#         return f"Success! Emails queued for managers of: {teams_str}"
        
#     return "All teams are active, or no manager emails were found."

from frappe.utils import nowdate, get_url

# from frappe.utils import nowdate

# @frappe.whitelist()
# def check_and_notify_inactive_teams():
#     """Runs at a scheduled time to alert specific team managers if their team hasn't started tasks."""
#     today = nowdate()
    
#     # 1. Find today's EOD record that is Started (Pending)
#     eod_records = frappe.get_all("Bank EOD", filters={"date": today, "status": "Pending"}, limit=1)
#     if not eod_records:
#         return "No active EOD found for today."
        
#     eod = frappe.get_doc("Bank EOD", eod_records[0].name)
    
#     # 2. Analyze task completion per team
#     team_status = {}
#     for row in eod.eod_tasks:
#         if row.team not in team_status:
#             team_status[row.team] = {"total": 0, "completed": 0}
        
#         team_status[row.team]["total"] += 1
#         if row.status == "Completed":
#             team_status[row.team]["completed"] += 1
            
#     notified_teams = []

#     # 3. Check each team and send targeted emails to their managers
#     for team_name, stats in team_status.items():
#         if stats["total"] > 0 and stats["completed"] == 0:
            
#             # Fetch the manager emails specifically for THIS team
#             manager_emails_raw = frappe.db.get_value("EOD Team", team_name, "manager_emails")
            
#             if manager_emails_raw:
#                 # Split by comma to support single or multiple emails safely
#                 email_list = [e.strip() for e in manager_emails_raw.split(",") if e.strip()]
                
#                 if email_list:
#                     subject = f"⚠️ Action Required: EOD Tasks Pending for Team {team_name}"
                    
#                     # Enhanced, modern HTML email template
#                     message = f"""
#                     <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        
#                         <!-- Header -->
#                         <div style="background-color: #ef4444; padding: 20px; text-align: center;">
#                             <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">
#                                 Action Required: EOD Alert
#                             </h2>
#                         </div>
                        
#                         <!-- Body Content -->
#                         <div style="padding: 30px; color: #374151; line-height: 1.6;">
#                             <p style="font-size: 16px; margin-top: 0;">Hello,</p>
#                             <p style="font-size: 16px;">The End of Day (EOD) process for <strong>{today}</strong> is currently active. However, our system indicates that your team has not started their assigned tasks.</p>
                            
#                             <!-- Highlight Box -->
#                             <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 18px; margin: 25px 0; border-radius: 0 6px 6px 0;">
#                                 <h3 style="margin: 0 0 12px 0; color: #991b1b; font-size: 18px; border-bottom: 1px solid #fecaca; padding-bottom: 8px;">
#                                     Team: {team_name}
#                                 </h3>
#                                 <table style="width: 100%; border-collapse: collapse;">
#                                     <tr>
#                                         <td style="padding: 6px 0; color: #4b5563; font-size: 15px;">Total Tasks Assigned:</td>
#                                         <td style="padding: 6px 0; font-weight: bold; color: #111827; text-align: right; font-size: 15px;">{stats['total']}</td>
#                                     </tr>
#                                     <tr>
#                                         <td style="padding: 6px 0; color: #4b5563; font-size: 15px;">Tasks Completed:</td>
#                                         <td style="padding: 6px 0; font-weight: bold; color: #ef4444; text-align: right; font-size: 15px;">0</td>
#                                     </tr>
#                                 </table>
#                             </div>
                            
#                             <p style="font-size: 16px;">To ensure the EOD process completes smoothly and on time, please follow up with your team members to execute their checklist items.</p>
                            
#                             <!-- Action Button -->
#                             <div style="text-align: center; margin: 35px 0 10px 0;">
#                                 <a href="https://mysahayog.com/eod-checklist" style="background-color: #1f2937; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
#                                     Go to EOD Checklist
#                                 </a>
#                             </div>
#                         </div>
                        
#                         <!-- Footer -->
#                         <div style="background-color: #f9fafb; padding: 16px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
#                             <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated notification from the Sahayog EOD System.</p>
#                             <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 12px;">Please do not reply to this email.</p>
#                         </div>
                        
#                     </div>
#                     """
                    
#                     # Send the targeted email (without now=True so it hits the queue if testing offline)
#                     frappe.sendmail(
#                         recipients=email_list,
#                         subject=subject,
#                         message=message
#                     )
#                     notified_teams.append(team_name)

#     # 4. Optional: Log a single message in the EOD Chat summarizing who was alerted
#     if notified_teams:
#         teams_str = ", ".join(notified_teams)
        
#         # Make sure you import add_chat_message at the top if it isn't already
#         add_chat_message(
#             eod, 
#             f"System Alert: Managers for the following inactive teams have been notified via email: {teams_str}.", 
#             sender="System", 
#             is_system=True
#         )
#         eod.save(ignore_permissions=True)
#         frappe.db.commit()
        
#         return f"Success! Emails queued for managers of: {teams_str}"
        
#     return "All teams are active, or no manager emails were found."


from frappe.utils import nowdate

@frappe.whitelist()
def check_and_notify_inactive_teams():
    """Runs at a scheduled time to alert specific team managers if their team hasn't started tasks."""
    today = nowdate()
    
    # 1. Find today's EOD record that is Started (Pending)
    eod_records = frappe.get_all("Bank EOD", filters={"date": today, "status": "Pending"}, limit=1)
    if not eod_records:
        return "No active EOD found for today."
        
    eod = frappe.get_doc("Bank EOD", eod_records[0].name)
    
    # 2. Analyze task completion per team
    team_status = {}
    for row in eod.eod_tasks:
        if row.team not in team_status:
            team_status[row.team] = {"total": 0, "completed": 0}
        
        team_status[row.team]["total"] += 1
        if row.status == "Completed":
            team_status[row.team]["completed"] += 1
            
    notified_teams = []


    # 3. Check each team and send targeted emails to their managers
    for team_name, stats in team_status.items():
        if stats["total"] > 0 and stats["completed"] == 0:
            
            # Fetch the manager emails specifically for THIS team
            manager_emails_raw = frappe.db.get_value("EOD Team", team_name, "manager_emails")
            
            if manager_emails_raw:
                # Split by comma to support single or multiple emails safely
                email_list = [e.strip() for e in manager_emails_raw.split(",") if e.strip()]
                
                if email_list:
                    subject = f"⚠️ Action Required: EOD Tasks Pending for Team {team_name}"
                    
                    # COMPACT, modern HTML email template
                    message = f"""
                    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        
                        <!-- Header (Reduced padding & font size) -->
                        <div style="background-color: #ef4444; padding: 12px; text-align: center;">
                            <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600; letter-spacing: 0.5px;">
                                Action Required: EOD Alert
                            </h2>
                        </div>
                        
                        <!-- Body Content (Reduced padding & margins) -->
                        <div style="padding: 20px; color: #374151; line-height: 1.5;">
                            <p style="font-size: 15px; margin-top: 0; margin-bottom: 10px;">Hello,</p>
                            <p style="font-size: 15px; margin: 0 0 10px 0;">The End of Day (EOD) process for <strong>{today}</strong> is currently active. However, our system indicates that your team has not started their assigned tasks.</p>
                            
                            <!-- Highlight Box (Compact margins & padding) -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 15px; margin: 15px 0; border-radius: 0 4px 4px 0;">
                                <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 16px; border-bottom: 1px solid #fecaca; padding-bottom: 6px;">
                                    Team: {team_name}
                                </h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 4px 0; color: #4b5563; font-size: 14px;">Total Tasks Assigned:</td>
                                        <td style="padding: 4px 0; font-weight: bold; color: #111827; text-align: right; font-size: 14px;">{stats['total']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; color: #4b5563; font-size: 14px;">Tasks Completed:</td>
                                        <td style="padding: 4px 0; font-weight: bold; color: #ef4444; text-align: right; font-size: 14px;">0</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p style="font-size: 15px; margin: 0;">To ensure the EOD process completes smoothly and on time, please follow up with your team members to execute their checklist items.</p>
                            
                            <!-- Action Button (Reduced margin) -->
                            <div style="text-align: center; margin: 20px 0 5px 0;">
                                <a href="https://mysahayog.com/eod-checklist" style="background-color: #1f2937; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
                                    Go to EOD Checklist
                                </a>
                            </div>
                        </div>
                        
                        <!-- Footer (Compressed) -->
                        <div style="background-color: #f9fafb; padding: 12px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 11px;">This is an automated notification from the Sahayog EOD System.</p>
                        </div>
                        
                    </div>
                    """
                    
                    # Send the targeted email (without now=True so it hits the queue if testing offline)
                    frappe.sendmail(
                        recipients=email_list,
                        subject=subject,
                        message=message
                    )
                    notified_teams.append(team_name)


    # 4. Optional: Log a single message in the EOD Chat summarizing who was alerted
    if notified_teams:
        teams_str = ", ".join(notified_teams)
        
        # Make sure you import add_chat_message at the top if it isn't already
        add_chat_message(
            eod, 
            f"System Alert: Managers for the following inactive teams have been notified via email: {teams_str}.", 
            sender="System", 
            is_system=True
        )
        eod.save(ignore_permissions=True)
        frappe.db.commit()
        
        return f"Success! Emails queued for managers of: {teams_str}"
        
    return "All teams are active, or no manager emails were found."