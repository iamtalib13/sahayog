import frappe
from frappe import _
from frappe.utils import nowdate, now_datetime, format_time, format_datetime

def add_chat_message(eod_doc, text, sender="System", is_system=True):
    """Helper to add a message to the EOD chat."""
    eod_doc.append("chat_messages", {
        "sender": sender,
        "text": text,
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
    if frappe.db.exists("Bank EOD", {"date": today}):
        return get_eod_status()
    
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

@frappe.whitelist(methods=["GET", "POST"])
def update_task_status(eod_name, task_row_name, done):
    """Updates the status of a specific task in Bank EOD."""
    # Convert 'true'/'false' strings to boolean if sent via GET
    if isinstance(done, str):
        done = done.lower() == 'true'

    eod = frappe.get_doc("Bank EOD", eod_name)
    updated = False
    
    sorted_tasks = sorted(eod.eod_tasks, key=lambda x: (x.sequence or 0, x.idx))
    
    for i, row in enumerate(sorted_tasks):
        if row.name == task_row_name:
            prev_status = row.status
            row.status = "Completed" if done else "Pending"
            
            if done and prev_status != "Completed":
                row.completed_by = frappe.session.user
                row.completed_on = now_datetime()
                
                # Chat message for completion
                add_chat_message(eod, f"Task '{row.task}' (Team: {row.team}) completed by {frappe.session.user}.")
                
                # Initiate next task if available
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
        # Check if all tasks are completed to update parent status
        all_done = all(r.status == "Completed" for r in eod.eod_tasks)
        if all_done:
            eod.status = "Completed"
        else:
            eod.status = "Pending"
            
        eod.save(ignore_permissions=True)
        frappe.db.commit()
        return {"status": "success", "eod_status": eod.status}
        
    return {"status": "error", "message": "Task not found"}

@frappe.whitelist()
def get_chat_messages(eod_name):
    """Returns all chat messages for a given EOD session."""
    if not eod_name:
        return []
    
    messages = frappe.get_all("EOD Chat Message", 
        filters={"parent": eod_name}, 
        fields=["sender", "text", "time", "is_system"],
        order_by="time asc"
    )
    
    for msg in messages:
        msg["is_me"] = (msg["sender"] == frappe.session.user and not msg["is_system"])
        msg["time_display"] = format_time(msg["time"], "HH:mm") if msg["time"] else ""
    
    return messages

@frappe.whitelist(methods=["GET", "POST"])
def send_chat_message(eod_name, text):
    """API to send a manual chat message."""
    if not eod_name or not text:
        return
    
    eod = frappe.get_doc("Bank EOD", eod_name)
    add_chat_message(eod, text, sender=frappe.session.user, is_system=False)
    eod.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "success"}

@frappe.whitelist(methods=["GET", "POST"])
def close_eod(eod_name):
    """Sets the Bank EOD status to 'Closed'."""
    eod = frappe.get_doc("Bank EOD", eod_name)
    
    # Verify all tasks are done before closing
    all_done = all(r.status == "Completed" for r in eod.eod_tasks)
    if not all_done:
        frappe.throw(_("Cannot close EOD. Some tasks are still pending."))
        
    eod.status = "Closed"
    add_chat_message(eod, "EOD process closed for today.")
    eod.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "success", "eod_status": eod.status}
