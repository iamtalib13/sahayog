import frappe
import os
from frappe import _
from frappe.utils import nowdate, now_datetime, format_time, format_datetime, get_files_path
from frappe.utils.file_manager import save_file

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

@frappe.whitelist()
def get_eod_status():
    """Returns the current EOD record and its status for today."""
    today = nowdate()
    eod = frappe.db.get_value("Bank EOD", {"date": today}, ["name", "status"], as_dict=True)
    if eod:
        return eod
    return {"status": "idle"}

@frappe.whitelist()
def start_eod():
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
    current_dt = format_datetime(now_datetime(), "dd MMMM yyyy, hh:mm a")
    add_chat_message(eod, f"EOD started for date {today} at {current_dt}")

    # 2. Send first task initiation message
    if eod.eod_tasks:
        sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))
        first_task = sorted_tasks[0]
        add_chat_message(eod, f"Task '{first_task.task}' (Team: {first_task.team}) initiated.")
    
    eod.save(ignore_permissions=True)
    frappe.db.commit()

    return {"name": eod.name, "status": eod.status}

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
        tasks.append({
            "name": row.name,
            "team": row.team,
            "sequence": row.sequence,
            "task": row.task,
            "status": row.status,
            "completed_by": row.completed_by,
            "completed_on": row.completed_on,
            "done": True if row.status == "Completed" else False
        })

    return tasks

# @frappe.whitelist(methods=["GET", "POST"])
# def update_task_status(eod_name, task_row_name, done):
#     """Updates the status of a specific task in Bank EOD."""
#     # Convert 'true'/'false' strings to boolean if sent via GET
#     if isinstance(done, str):
#         done = done.lower() == 'true'

#     eod = frappe.get_doc("Bank EOD", eod_name)
    
#     if eod.status == "Closed":
#         frappe.throw(_("Cannot update task status. EOD process for {0} is already closed.").format(eod.date))

#     updated = False
#     sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))
    
#     # for i, row in enumerate(sorted_tasks):
#     #     if row.name == task_row_name:
#     #         prev_status = row.status
#     #         row.status = "Completed" if done else "Pending"
            
#     #         if done and prev_status != "Completed":
#     #             row.completed_by = frappe.session.user
#     #             row.completed_on = now_datetime()
#     #             user_fullname = get_user_fullname(frappe.session.user)
#     #             add_chat_message(eod, f"Task '{row.task}' (Team: {row.team}) completed by {user_fullname}.")
                
#     #             if i + 1 < len(sorted_tasks):
#     #                 next_task = sorted_tasks[i+1]
#     #                 add_chat_message(eod, f"Task '{next_task.task}' (Team: {next_task.team}) initiated.")
            
#     #         elif not done and prev_status == "Completed":
#     #             row.completed_by = None
#     #             row.completed_on = None
#     #             add_chat_message(eod, f"Task '{row.task}' (Team: {row.team}) set back to Pending.")

#     #         updated = True
#     #         break
            

#     for i, row in enumerate(sorted_tasks):
#         if row.name == task_row_name:
#             # NEW: Validate if the user is a team member, lead, or Administrator
#             if frappe.session.user != "Administrator":
#                 is_member = frappe.db.exists("Team Members", {"parent": row.team, "user": frappe.session.user})
#                 is_lead = frappe.db.exists("EOD Team", {"name": row.team, "team_lead": frappe.session.user})
                
#                 if not (is_member or is_lead):
#                     return {"status": "error", "message": f"Permission denied. You are not a member of the {row.team} team."}

#             # Existing status update logic continues below
#             prev_status = row.status
#             row.status = "Completed" if done else "Pending"

#     if updated:
#         eod.save(ignore_permissions=True)
#         frappe.db.commit()
#         return {"status": "success", "eod_status": eod.status}
        
#     return {"status": "error", "message": "Task not found"}

@frappe.whitelist()
def get_chat_messages(eod_name):
    """Returns all chat messages for a given EOD session."""
    if not eod_name:
        return []
    
    messages = frappe.get_all("EOD Chat Message", 
        filters={"parent": eod_name}, 
        fields=["name", "sender", "text", "attachment", "time", "is_system"],
        order_by="time asc"
    )
    
    for msg in messages:
        msg["is_me"] = (msg["sender"] == frappe.session.user and not msg["is_system"])
        msg["sender_name"] = "System" if msg["is_system"] else get_user_fullname(msg["sender"])
        msg["time_display"] = format_time(msg["time"], "HH:mm") if msg["time"] else ""
        
        if msg["attachment"]:
            msg["is_image"] = any(msg["attachment"].lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"])
            msg["file_name"] = msg["attachment"].split("/")[-1]
    
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
        
    # Manual transition to Closed
    eod.status = "Closed"
    add_chat_message(eod, "EOD process closed for today.")
    
    eod.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "success", "eod_status": eod.status}


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
            row.status = "Completed" if done else "Pending"
            
            if done and prev_status != "Completed":
                row.completed_by = frappe.session.user
                row.completed_on = now_datetime()
                user_fullname = get_user_fullname(frappe.session.user)
                add_chat_message(eod, f"Task '{row.task}' (Team: {row.team}) completed by {user_fullname}.")
                
                if i + 1 < len(sorted_tasks):
                    next_task = sorted_tasks[i+1]
                    add_chat_message(eod, f"Task '{next_task.task}' (Team: {next_task.team}) initiated.")
            
            elif not done and prev_status == "Completed":
                row.completed_by = None
                row.completed_on = None
                add_chat_message(eod, f"Task '{row.task}' (Team: {row.team}) set back to Pending.")
                
            updated = True
            break
            
    if updated:
        eod.save(ignore_permissions=True)
        frappe.db.commit()
        return {"status": "success", "eod_status": eod.status}
        
    return {"status": "error", "message": "Task not found"}


@frappe.whitelist()
def check_eod_access():
    """Checks if the logged-in user has the required roles to view the EOD page."""
    user_roles = frappe.get_roles(frappe.session.user)
    has_access = (
        "EOD Checklist Manager" in user_roles or 
        "EOD Checklist Member" in user_roles or 
        "Administrator" in user_roles
    )
    return has_access