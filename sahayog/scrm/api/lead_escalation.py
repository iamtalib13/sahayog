import frappe
import json
from frappe.utils import now_datetime
from datetime import timedelta

def run_escalation_check():
    # Fetch all CRM Lead records
    leads = frappe.get_all("CRM Lead", filters={}, fields=["name"])
    
    for lead_doc in leads:
        lead = frappe.get_doc("CRM Lead", lead_doc.name)
        updated = False

        for row in lead.get("custom_escalation_matrix"):
            if (
                not row.is_escalated and
                row.communication_status == "Open" and
                row.current_escalation_status == "Pending" and
                row.end_time and
                row.end_time < now_datetime()
            ):
                row.is_escalated = 1
                row.current_escalation_status = "Escalated"  # Directly set the current_escalation_status here
                updated = True
                escalate_to_next_level(lead, row)

        if updated:
            lead.save(ignore_permissions=True)
            frappe.log_error(f"Escalation check updated for lead: {lead.name}", "Escalation Check")

def escalate_to_next_level(doc, row):
    next_user = get_reporting_user(row.user)
    if next_user:
        level = get_escalation_level(doc, row)

        if level < 3:  # Max 3 levels
            escalation_times = [1, 2]  # Only 2 levels have time-based escalation
            new_end_time = None
            
            # If it is the final level, we don't set an end time
            if level < 2:
                new_end_time = row.end_time + timedelta(minutes=escalation_times[level])

            # Prevent duplicate entries for the next user
            next_row_exists = any(
                next_row.user == next_user and 
                next_row.is_escalated == 0 and 
                next_row.current_escalation_status == "Pending"
                for next_row in doc.get("custom_escalation_matrix")
            )

            if not next_row_exists:
                doc.append("custom_escalation_matrix", {
                    "user": next_user,
                    "current_escalation_status": "Pending",
                    "communication_status": "Open",
                    "start_time": row.end_time,
                    "end_time": new_end_time,   # This will be None for the 3rd level
                    "is_escalated": 0
                })
                doc.save(ignore_permissions=True)
                
                # Share the document with the next user
                share_document_with_user(doc, next_user)


def get_escalation_level(doc, row):
    # Count already escalated rows
    return len([r for r in doc.get("custom_escalation_matrix") if r.is_escalated == 1])

def get_reporting_user(user_id):
    employee = frappe.db.get_value("Employee", {"user_id": user_id}, ["name", "reports_to"], as_dict=True)
    if employee and employee.reports_to:
        return frappe.db.get_value("Employee", employee.reports_to, "user_id")
    return None

def share_document_with_user(doc, user_id):
    if not user_id:
        return

    # Reload to ensure fresh data
    doc.reload()

    try:
        # ✅ Set the user ID in custom_escalated_to
        doc.db_set("custom_escalated_to", user_id, update_modified=False)

        # ✅ Fetch full name of the user
        full_name = frappe.db.get_value("User", user_id, "full_name")

        # ✅ Set custom_escalated_to_user with formatted text
        if full_name:
            doc.db_set("custom_escalated_to_user", full_name, update_modified=False)

        # ✅ Add sharing permission
        frappe.share.add(doc.doctype, doc.name, user_id, read=1, write=1)

        # ✅ Log escalation
        log_escalation_activity(doc, user_id)

        frappe.log_error(f"Document escalated to {user_id} for Lead: {doc.name}", "Escalation Tracking")

    except Exception as e:
        frappe.log_error(str(e), "Failed to escalate document")


# Function to log escalation activity
# This function logs the escalation activity in the comments section of the document
def log_escalation_activity(doc, escalated_to_user_id):
    if not escalated_to_user_id:
        return

    full_name = frappe.get_value("User", escalated_to_user_id, "full_name")

    comment = frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Comment",
        "reference_doctype": doc.doctype,
        "reference_name": doc.name,
        "content": f"📌 Lead escalated to <b>{full_name}</b>.",
        "comment_by": "crmbot",
        "comment_email": "crmbot@sahayog.com"
    })

    comment.insert(ignore_permissions=True)

    # Force-set the owner field AFTER insert
    frappe.db.set_value("Comment", comment.name, "owner", "crmbot@sahayog.com")
