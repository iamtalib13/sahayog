import frappe
from frappe import _
from frappe.utils import nowdate, now_datetime

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
    
    for row in eod.eod_tasks:
        if row.name == task_row_name:
            row.status = "Completed" if done else "Pending"
            if done:
                row.completed_by = frappe.session.user
                row.completed_on = now_datetime()
            else:
                row.completed_by = None
                row.completed_on = None
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

@frappe.whitelist(methods=["GET", "POST"])
def close_eod(eod_name):
    """Sets the Bank EOD status to 'Closed'."""
    eod = frappe.get_doc("Bank EOD", eod_name)
    
    # Verify all tasks are done before closing
    all_done = all(r.status == "Completed" for r in eod.eod_tasks)
    if not all_done:
        frappe.throw(_("Cannot close EOD. Some tasks are still pending."))
        
    eod.status = "Closed"
    eod.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "success", "eod_status": eod.status}
