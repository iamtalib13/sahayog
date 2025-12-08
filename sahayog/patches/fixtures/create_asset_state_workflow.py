# asset_workflow.py
import frappe
from frappe import _


def create_asset_workflow():
    """Create Asset Workflow after migration"""

    # Check if workflow already exists
    if frappe.db.exists("Workflow", "Asset state"):
        print("Workflow 'Asset state' already exists")
        return

    # Create Workflow
    workflow = frappe.get_doc(
        {
            "doctype": "Workflow",
            "workflow_name": "Asset state",
            "document_type": "Asset",  # Change this to your actual doctype
            "workflow_state_field": "workflow_state",
            "is_active": 1,
            "send_email_alert": 0,
            "override_status": 0,
            # States
            "states": [
                {
                    "state": "Draft",
                    "doc_status": "0",
                    "allow_edit": "Sales Manager",
                    "update_field": "status",
                    "update_value": "Draft",
                },
                {
                    "state": "Assign",
                    "doc_status": "1",
                    "allow_edit": "System Manager",
                    "update_field": "status",
                    "update_value": "Assign",
                },
            ],
            # Transitions
            "transitions": [
                {
                    "state": "Draft",
                    "action": "Submit",
                    "next_state": "Assign",
                    "allowed": "System Manager",
                    "allow_self_approval": 0,
                }
            ],
        }
    )

    workflow.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"Workflow '{workflow.name}' created successfully")


def execute():
    """Execute function to be called in migration"""
    create_asset_workflow()
