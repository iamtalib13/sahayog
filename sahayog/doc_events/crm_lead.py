import frappe
from frappe.utils import now_datetime

def set_lead_owner_branch(doc, method):
    if frappe.session.user != "Administrator":  # Check if the user is not admin
        try:
            # Fetch branch, region, and zone from Employee doctype for current user
            result = frappe.db.get_value(
                "Employee",
                {"user_id": frappe.session.user},
                ["branch", "custom_region", "custom_zone"]
            )

            if not result:
                frappe.throw("Could not fetch Branch, Region, or Zone for the current user. Please ensure your employee details are properly set.")

            branch, region, zone = result

            # Only set if those fields are not already set in doc
            if not (doc.custom_lead_owner_branch and doc.custom_region and doc.custom_zone):
                if branch:
                    doc.custom_lead_owner_branch = branch
                if region:
                    doc.custom_region = region
                if zone:
                    doc.custom_zone = zone

        except Exception as e:
            frappe.throw("An error occurred while fetching your branch details. Please contact the administrator.")


# It sets the SLA field to "Sahayog SLA" if it is empty
# and the field exists in the document's metadata
def set_sla(doc, method):
    try:
        if 'sla' in doc.as_dict():
            if not doc.sla:
                doc.sla = "Sahayog SLA"
        else:
            # Log warning if 'sla' field does not exist
            frappe.log_error(f"'SLA' field not found in {doc.doctype}. Please check the configuration.", "Set SLA Warning")
            print(f"Warning: 'SLA' field not found in {doc.doctype}. Please check the configuration.")
    except Exception as e:
        # Log any unexpected errors during SLA setting
        frappe.log_error(f"Error setting SLA for {doc.doctype} {doc.name}: {str(e)}", "Set SLA Error")
        print(f"Error setting SLA for {doc.doctype} {doc.name}: {str(e)}")




# This function is triggered when a lead is created
# It adds a new row to the escalation matrix with the initial values
def add_escalation_matrix_row(doc, method):
    # When a new lead is created, append a new row to the escalation matrix with default values
    doc.append("custom_escalation_matrix", {
        "user": doc.owner,
        "current_escalation_status": "Pending",
        "start_time": doc.creation,
        "end_time": doc.response_by,
        "is_escalated": 0
    })
    doc.save(ignore_permissions=True)

# This function is triggered when a lead is updated 
import frappe
from frappe.utils import now_datetime

# It checks if the communication status has been updated to "Actioned"
def update_escalation_matrix_row(doc, method):
    # Get the current user who is performing the action
    current_user = frappe.session.user
    frappe.log_error(f"Update triggered by: {current_user} for Lead: {doc.name}", "Escalation Matrix Update")

    # Check if the parent communication_status has been updated to "Actioned"
    if doc.communication_status == "Actioned":
        # Loop through the custom escalation matrix of the CRM Lead
        for row in doc.get("custom_escalation_matrix"):
            frappe.log_error(f"Processing escalation matrix row: {row.name} for Lead: {doc.name}", "Escalation Matrix Update")

            # Check if the 'user' field in the row matches the current user
            if row.user == current_user:
                frappe.log_error(f"User match found for row: {row.name}, User: {current_user}", "Escalation Matrix Update")

                # If the row's SLA status is not already "Fulfilled", update it
                if row.current_escalation_status != "Fulfilled":
                    row.current_escalation_status = "Fulfilled"
                    frappe.log_error(f"Row updated to Fulfilled: {row.name}, current escalation Status: {row.current_escalation_status}, Lead: {doc.name}", "Escalation Matrix Update")

                try:
                    # Save the updated row
                    row.db_update()
                    frappe.log_error(f"Row updated: {row.name}, SLA Status: {row.current_escalation_status}, Updated by: {current_user}", "Escalation Matrix Update")
                except Exception as e:
                    # Log any errors that occur during row update
                    frappe.log_error(f"Error updating row: {row.name}, Error: {str(e)}, Attempted by: {current_user}", "Escalation Matrix Update")
            else:
                frappe.log_error(f"No match for user: {current_user} in row: {row.name}", "Escalation Matrix Update")

    try:
        frappe.db.commit()  # Ensure the changes are committed
        frappe.log_error(f"Escalation Matrix committed for Lead: {doc.name} by {current_user}", "Escalation Matrix Update")
    except Exception as e:
        # Log any errors during commit
        frappe.log_error(f"Error committing changes for Lead: {doc.name}, Error: {str(e)}, Attempted by: {current_user}", "Escalation Matrix Update")

    # Log to ensure updates have been made
    frappe.log_error(f"Escalation Matrix updated for Lead: {doc.name} by {current_user}", "Escalation Matrix Update")


# def update_escalation_matrix_row(doc, method):

#     # Check if the parent communication_status has been updated to "Actioned"
#     if doc.communication_status == "Actioned":
#         # Loop through the custom escalation matrix of the CRM Lead
#         for row in doc.get("custom_escalation_matrix"):
#             frappe.log_error(f"Processing escalation matrix row: {row.name} for Lead: {doc.name}", "Escalation Matrix Update")

#             # If the row's SLA status is not already "Fulfilled", update it
#             if row.current_escalation_status != "Fulfilled":
#                 row.current_escalation_status = "Fulfilled"
#                 row.communication_status = "Actioned"  # Update communication status to Closed
#                 frappe.log_error(f"Row updated to Fulfilled: {row.name}, current escalation Status: {row.current_escalation_status}, Lead: {doc.name}", "Escalation Matrix Update")
            
#             try:
#                 # Save the updated row
#                 row.db_update()
#                 frappe.log_error(f"Row updated: {row.name}, SLA Status: {row.current_escalation_status}", "Escalation Matrix Update")
#             except Exception as e:
#                 # Log any errors that occur during row update
#                 frappe.log_error(f"Error updating row: {row.name}, Error: {str(e)}", "Escalation Matrix Update")

    
#     try:
#         frappe.db.commit()  # Ensure the changes are committed
#         frappe.log_error(f"Escalation Matrix committed for Lead: {doc.name}", "Escalation Matrix Update")
#     except Exception as e:
#         # Log any errors during commit
#         frappe.log_error(f"Error committing changes for Lead: {doc.name}, Error: {str(e)}", "Escalation Matrix Update")

#     # Log to ensure updates have been made
#     frappe.log_error(f"Escalation Matrix updated for Lead: {doc.name}", "Escalation Matrix Update")


import re

# This function is triggered before saving a lead
# It validates the mobile number field to ensure it is mandatory and exactly 10 digits
def validate_lead_fields(doc, method):
    # Validate Mobile Number - Mandatory and 10 digits check
    if not doc.mobile_no:
        frappe.throw("Mobile Number is mandatory.")
    
    if not re.match(r'^\d{10}$', doc.mobile_no):
        frappe.throw("Invalid Mobile Number. It should be exactly 10 digits.")
