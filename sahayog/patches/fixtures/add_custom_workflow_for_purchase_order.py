# import frappe

# def execute():
#     workflow_name = "Purchase Order"
#     doctype_name = "Purchase Order"

#     # Check if the workflow already exists to avoid duplication
#     if frappe.db.exists("Workflow", workflow_name):
#         frappe.delete_doc("Workflow", workflow_name)

#     # Create Workflow States
#     states = [
#         {"state": "Draft", "doc_status": 0, "update_field": "custom_sahyog_status", "update_value": "Draft", "allow_edit": "System Manager"},
#         {"state": "Pending From Purchase Manager", "doc_status": 0, "update_field": "custom_sahyog_status", "update_value": "Pending From Purchase Manager", "allow_edit": "System Manager"},
#         {"state": "Pending From CFO", "doc_status": 0, "update_field": "custom_sahyog_status", "update_value": "Pending From CFO", "allow_edit": "System Manager"},
#         {"state": "Approved", "doc_status": 0, "update_field": "custom_sahyog_status", "update_value": "Approved", "allow_edit": "System Manager"},
#         {"state": "Rejected", "doc_status": 0, "update_field": "custom_sahyog_status", "update_value": "Rejected", "allow_edit": "System Manager"},
#         {"state": "Correction Required", "doc_status": 0, "update_field": "custom_sahyog_status", "update_value": "Correction Required", "allow_edit": "System Manager"},
#         {"state": "Submitted", "doc_status": 1, "update_field": "custom_sahyog_status", "update_value": "Submitted", "allow_edit": "System Manager"},
#         {"state": "Cancelled", "doc_status": 2, "update_field": "custom_sahyog_status", "update_value": "Cancelled", "allow_edit": "System Manager"},
#     ]

#     # Create Transition Rules
#     transitions = [
#         {"state": "Draft", "action": "Send For Verification", "next_state": "Pending From Purchase Manager", "allowed": "System Manager"},
#         {"state": "Rejected", "action": "Send For Verification", "next_state": "Pending From Purchase Manager", "allowed": "System Manager"},
#         {"state": "Pending From Purchase Manager", "action": "Send For Approval", "next_state": "Pending From CFO", "allowed": "System Manager"},
#         {"state": "Pending From Purchase Manager", "action": "Correction Required", "next_state": "Correction Required", "allowed": "System Manager"},
#         {"state": "Approved", "action": "Submit", "next_state": "Submitted", "allowed": "System Manager"},
#         {"state": "Submitted", "action": "Cancel", "next_state": "Cancelled", "allowed": "System Manager"},
#         {"state": "Pending From CFO", "action": "Approve", "next_state": "Approved", "allowed": "System Manager"},
#         {"state": "Pending From CFO", "action": "Reject", "next_state": "Rejected", "allowed": "System Manager"},
#         {"state": "Correction Required", "action": "Send For Verification", "next_state": "Pending From Purchase Manager", "allowed": "System Manager"},
#     ]

#     # Create Workflow
#     workflow = frappe.get_doc({
#         "doctype": "Workflow",
#         "workflow_name": workflow_name,
#         "document_type": doctype_name,
#         "is_active": 1,
#         "override_status": 0,
#         "workflow_state_field": "workflow_state",
#         "states": states,
#         "transitions": transitions,
#     })
    
#     workflow.insert()
#     frappe.db.commit()

#     print(f"Workflow '{workflow_name}' created successfully!")

