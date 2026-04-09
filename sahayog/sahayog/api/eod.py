import frappe
import os
from frappe import _
from frappe.utils import nowdate, now_datetime, format_time, format_datetime, get_files_path
from frappe.utils.file_manager import save_file
import json
from frappe.utils.pdf import get_pdf
from frappe.utils import format_time, format_date

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
            # FIXED: Now it sends the Full Name instead of the raw User ID (like "42")
            "completed_by": get_user_fullname(row.completed_by) if row.completed_by else None,
            "completed_on": row.completed_on,
            "done": True if row.status == "Completed" else False
        })

    return tasks


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
    """Checks roles and returns access flags."""
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    # Absolute override for Admin / System Manager
    if user == "Administrator" or "System Manager" in roles:
        return {"has_access": True, "is_manager": True}
        
    return {
        "has_access": "EOD Checklist Manager" in roles or "EOD Checklist Member" in roles,
        "is_manager": "EOD Checklist Manager" in roles
    }



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
    
    checklist_name = frappe.db.get_value("EOD Checklist", {"team": team_name, "is_active": 1}, "name")
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
        "members": members,
        "tasks": sorted(tasks, key=lambda x: int(x.get("sequence") or 0)),
        "system_users": system_users
    }



@frappe.whitelist(methods=["POST"])
def save_manager_data():
    """Saves the updated team members and checklist tasks without triggering 403s."""
    # Capture the actual logged-in user
    original_user = frappe.session.user
    
    try:
        team_name = frappe.form_dict.get("team_name")
        checklist_name = frappe.form_dict.get("checklist_name")
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
        
        # 3. Update Team Members
        team_doc = frappe.get_doc("EOD Team", team_name)
        team_doc.set("team_members", [])
        for m in members:
            if m.get("user"):
                team_doc.append("team_members", {"user": m.get("user")})
        team_doc.save(ignore_permissions=True)
        
        # 4. Update Checklist Tasks
        if checklist_name:
            chk_doc = frappe.get_doc("EOD Checklist", checklist_name)
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



@frappe.whitelist()
def download_eod_report(eod_name):
    """Generates and downloads a complete Audit PDF Report for the EOD."""
    if not eod_name:
        return
        
    eod = frappe.get_doc("Bank EOD", eod_name)
    sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))
    
    chat_messages = frappe.get_all("EOD Chat Message", 
        filters={"parent": eod_name}, 
        fields=["sender", "text", "time", "is_system", "attachment"],
        order_by="time asc"
    )

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
            
    html += """
    </body>
    </html>
    """
    
    # Tell Frappe to return a downloadable PDF file
    frappe.local.response.filename = f"EOD_Audit_{eod_name}.pdf"
    frappe.local.response.filecontent = get_pdf(html)
    frappe.local.response.type = "pdf"