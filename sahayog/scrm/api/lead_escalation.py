import frappe
import json
from frappe.utils import now_datetime
from datetime import timedelta


def run_escalation_check():
    """
    This function runs an escalation check on all CRM Leads with communication_status as 'Open'.
    It checks each row in the custom escalation matrix, escalates it if SLA is breached, 
    and sends it to the next active reporting person if available.
    """
    # Fetch all CRM Lead records
    leads = frappe.get_all("CRM Lead", filters={}, fields=["name"])
    
    for lead_doc in leads:
        # Get the lead document
        lead = frappe.get_doc("CRM Lead", lead_doc.name)

        # ✅ Check if the main document's communication_status is "Open" before proceeding
        if lead.communication_status != "Open":
            frappe.log_error(f"Skipped Lead: {lead.name} as communication_status is not 'Open'", "Escalation Check")
            continue
        
        frappe.log_error(f"Escalation check started for Lead: {lead.name}", "Escalation Check")
        
        # Flag to check if any updates were made
        updated = False

        # Loop through the custom escalation matrix
        for row in lead.get("custom_escalation_matrix"):
            if (
                not row.is_escalated and
                row.current_escalation_status == "Pending" and
                row.end_time and
                row.end_time < now_datetime()
            ):
                # Update escalation status
                row.is_escalated = 1
                row.current_escalation_status = "Escalated"
                updated = True

                # Call the escalation function
                escalate_to_next_level(lead, row)

        # ✅ Save the document if any rows were updated
        if updated:
            lead.save(ignore_permissions=True)
            frappe.log_error(f"Escalation check updated for Lead: {lead.name}", "Escalation Check")


def escalate_to_next_level(doc, row):
    """
    Escalates the current row to the next level by fetching the reporting person.
    If the reporting person is active, it creates a new row in the escalation matrix.
    """
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
                # ✅ Append a new row for the next user
                doc.append("custom_escalation_matrix", {
                    "user": next_user,
                    "current_escalation_status": "Pending",
                    "start_time": row.end_time,
                    "end_time": new_end_time,
                    "is_escalated": 0
                })
                
                # ✅ Save changes and share with the user
                doc.save(ignore_permissions=True)
                share_document_with_user(doc, next_user)


def get_escalation_level(doc, row):
    """
    Counts the number of escalated rows for a given document.
    """
    return len([r for r in doc.get("custom_escalation_matrix") if r.is_escalated == 1])


def get_reporting_user(user_id):
    """
    Fetch the reporting user's ID from the Employee table.
    If the reporting user exists and is active, return the user_id.
    Otherwise, return None.
    """
    # ✅ Fetch the current employee details
    employee = frappe.db.get_value("Employee", {"user_id": user_id}, ["name", "reports_to"], as_dict=True)
    
    # ✅ Check if the employee and reporting person exist
    if employee and employee.reports_to:
        # ✅ Get the reporting user's ID and status
        reporting_user_id, status = frappe.db.get_value(
            "Employee",
            {"name": employee.reports_to},
            ["user_id", "status"]
        )

        # ✅ Return the user_id only if the reporting person is Active
        if reporting_user_id and status == "Active":
            return reporting_user_id
        else:
            frappe.log_error(f"Reporting person for {user_id} is not active or does not exist.", "Escalation Check")
    
    # ❌ If the reporting person is not found or not active
    frappe.log_error(f"No valid reporting person found for {user_id}.", "Escalation Check")
    return None


def share_document_with_user(doc, user_id):
    """
    Shares the document with the specified user and logs the escalation activity.
    """
    if not user_id:
        return

    # ✅ Reload to ensure fresh data
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


def log_escalation_activity(doc, escalated_to_user_id):
    """
    Logs the escalation activity as a comment in the CRM Lead document.
    """
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
    frappe.db.set_value("Comment", comment.name, "owner", "crmbot@sahayog.com")
