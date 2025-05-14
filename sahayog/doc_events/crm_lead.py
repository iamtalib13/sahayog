import frappe
from frappe.utils import now_datetime

def set_lead_owner_branch(doc, method):
    if frappe.session.user != "Administrator":  # Check if the user is not admin
        if not doc.custom_lead_owner_branch:
            branch = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "branch")
            if branch:
                doc.custom_lead_owner_branch = branch

def set_sla(doc,method):
    if not doc.sla:
        doc.sla= "Sahayog SLA"


# This function is triggered when a lead is created
# It adds a new row to the escalation matrix with the initial values
def add_escalation_matrix_row(doc, method):
    # When a new lead is created, append a new row to the escalation matrix with default values
    doc.append("custom_escalation_matrix", {
        "user": doc.owner,
        "current_escalation_status": "Pending",
        "communication_status": doc.communication_status,
        "start_time": doc.creation,
        "end_time": doc.response_by,
        "is_escalated": 0
    })
    doc.save(ignore_permissions=True)

# This function is triggered when a lead is updated 
import frappe
from frappe.utils import now_datetime

def update_escalation_matrix_row(doc, method):

    # Check if the parent communication_status has been updated to "Actioned"
    if doc.communication_status == "Actioned":
        # Loop through the custom escalation matrix of the CRM Lead
        for row in doc.get("custom_escalation_matrix"):
            frappe.log_error(f"Processing escalation matrix row: {row.name} for Lead: {doc.name}", "Escalation Matrix Update")

            # If the row's SLA status is not already "Fulfilled", update it
            if row.current_escalation_status != "Fulfilled":
                row.current_escalation_status = "Fulfilled"
                row.communication_status = "Actioned"  # Update communication status to Closed
                frappe.log_error(f"Row updated to Fulfilled: {row.name}, current escalation Status: {row.current_escalation_status}, Lead: {doc.name}", "Escalation Matrix Update")
            
            try:
                # Save the updated row
                row.db_update()
                frappe.log_error(f"Row updated: {row.name}, SLA Status: {row.current_escalation_status}", "Escalation Matrix Update")
            except Exception as e:
                # Log any errors that occur during row update
                frappe.log_error(f"Error updating row: {row.name}, Error: {str(e)}", "Escalation Matrix Update")

    
    try:
        frappe.db.commit()  # Ensure the changes are committed
        frappe.log_error(f"Escalation Matrix committed for Lead: {doc.name}", "Escalation Matrix Update")
    except Exception as e:
        # Log any errors during commit
        frappe.log_error(f"Error committing changes for Lead: {doc.name}, Error: {str(e)}", "Escalation Matrix Update")

    # Log to ensure updates have been made
    frappe.log_error(f"Escalation Matrix updated for Lead: {doc.name}", "Escalation Matrix Update")
