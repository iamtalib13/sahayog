import frappe


def execute():
    """
    Create/Update Workflow and Workflow States for Employee Material Request
    """
    print("Setting up Employee Material Request Workflow...")

    # Create Workflow States first
    create_workflow_states()
    create_workflow_actions()
    frappe.db.commit()

    # Create or update Workflow
    create_or_update_workflow()

    frappe.db.commit()
    print("✓ Employee Material Request Workflow setup complete!")


def create_workflow_states():
    """Create all workflow states"""

    states = [
        {"doctype": "Workflow State", "workflow_state_name": "Draft", "style": ""},
        {
            "doctype": "Workflow State",
            "workflow_state_name": "Pending Reporting Person",
            "style": "Warning",
        },
        {
            "doctype": "Workflow State",
            "workflow_state_name": "Pending HO Approval",
            "style": "Warning",
        },
        {
            "doctype": "Workflow State",
            "workflow_state_name": "Approved",
            "style": "Success",
        },
        {
            "doctype": "Workflow State",
            "workflow_state_name": "Completed",
            "style": "Success",
        },
        {
            "doctype": "Workflow State",
            "workflow_state_name": "Rejected",
            "style": "Danger",
        },
        {
            "doctype": "Workflow State",
            "workflow_state_name": "Self Approved",
            "style": "Success",
        },
    ]

    for state in states:
        if not frappe.db.exists("Workflow State", state["workflow_state_name"]):
            doc = frappe.get_doc(state)
            doc.insert(ignore_permissions=True)
            print(f"  ✓ Created Workflow State: {state['workflow_state_name']}")


def create_workflow_actions():
    """Create Workflow actions"""
    actions = [
        {"doctype": "Workflow Action Master", "workflow_action_name": "Submit"},
        {"doctype": "Workflow Action Master", "workflow_action_name": "Approve"},
        {"doctype": "Workflow Action Master", "workflow_action_name": "Reject"},
        {"doctype": "Workflow Action Master", "workflow_action_name": "Self Approved"}
    ]
    
    for action in actions:
        if not frappe.db.exists("Workflow Action Master", action["workflow_action_name"]):
            doc = frappe.get_doc(action)
            doc.name = action["workflow_action_name"]
            doc.insert(ignore_permissions=True)
            print(f"  ✓ Created Workflow Action: {action['workflow_action_name']}")


def create_or_update_workflow():
    """Create or update workflow with states and transitions"""
    
    frappe.clear_cache()
    
    workflow_name = "Employee Material Request Workflow"
    
    workflow_data = {
        "doctype": "Workflow",
        "workflow_name": workflow_name,
        "document_type": "Employee Material Request",
        "workflow_state_field": "status",
        "is_active": 1,
        "send_email_alert": 0,
        "states": [
            {
                "state": "Draft",
                "doc_status": "0",
                "allow_edit": "Employee",
                "update_field": "status",
                "update_value": "Draft",
            },
            {
                "state": "Pending Reporting Person",
                "doc_status": "0",
                "allow_edit": "System Manager",
                "update_field": "status",
                "update_value": "Pending Reporting Person",
            },
            {
                "state": "Pending HO Approval",
                "doc_status": "0",
                "allow_edit": "System Manager",
                "update_field": "status",
                "update_value": "Pending HO Approval",
            },
            {
                "state": "Approved",
                "doc_status": "1",
                "allow_edit": "System Manager",
                "update_field": "status",
                "update_value": "Approved",
            },
            {
                "state": "Completed",
                "doc_status": "1",
                "allow_edit": "System Manager",
                "update_field": "status",
                "update_value": "Completed",
            },
            {
                "state": "Rejected",
                "doc_status": "0",
                "allow_edit": "Employee",
                "update_field": "status",
                "update_value": "Rejected",
            },
            {
                "state": "Self Approved",
                "doc_status": "1",
                "allow_edit": "System Manager",
                "update_field": "status",
                "update_value": "Self Approved",
            },
        ],
        "transitions": [
            {
                "state": "Draft",
                "action": "Submit",
                "next_state": "Pending Reporting Person",
                "allowed": "Employee",
                "allow_self_approval": 1,
            },
            {
                "state": "Pending Reporting Person",
                "action": "Approve",
                "next_state": "Pending HO Approval",
                "allowed": "Employee",
                "allow_self_approval": 0,
            },
            {
                "state": "Pending Reporting Person",
                "action": "Reject",
                "next_state": "Rejected",
                "allowed": "Employee",
                "allow_self_approval": 0,
            },
            {
                "state": "Pending HO Approval",
                "action": "Approve",
                "next_state": "Approved",
                "allowed": "Head Office Officer",
                "allow_self_approval": 0,
            },
            {
                "state": "Pending HO Approval",
                "action": "Reject",
                "next_state": "Rejected",
                "allowed": "Head Office Officer",
                "allow_self_approval": 0,
            },
            {
                "state": "Rejected",
                "action": "Submit",
                "next_state": "Pending Reporting Person",
                "allowed": "Employee",
                "allow_self_approval": 1,
            },
            {
                "state": "Pending Reporting Person",
                "action": "Self Approved",
                "next_state": "Self Approved",
                "allowed": "System Manager",
                "allow_self_approval": 1,
            },
            {
                "state": "Pending HO Approval",
                "action": "Self Approved", 
                "next_state": "Self Approved",
                "allowed": "System Manager",
                "allow_self_approval": 1,
            },
        ],
    }

    if frappe.db.exists("Workflow", workflow_name):
        doc = frappe.get_doc("Workflow", workflow_name)
        doc.update(workflow_data)
        doc.save(ignore_permissions=True)
        print(f"  ✓ Updated Workflow: {workflow_name}")
    else:
        doc = frappe.get_doc(workflow_data)
        doc.insert(ignore_permissions=True)
        print(f"  ✓ Created Workflow: {workflow_name}")

