import frappe


def execute():
    """
    Create Workflow and Workflow States for Employee Material Request
    """

    # Check if workflow already exists
    if frappe.db.exists("Workflow", "Employee Material Request Workflow"):
        print("✓ Workflow already exists, skipping...")
        return

    print("Creating Employee Material Request Workflow...")

    # Create Workflow States first
    create_workflow_states()

    create_workflow_actions()  # ADD THIS LINE
        
    # ADD THIS LINE:
    frappe.db.commit()

    # Create Workflow
    create_workflow()

    frappe.db.commit()
    print("✓ Employee Material Request Workflow created successfully!")


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
        else:
            print(f"  • State exists: {state['workflow_state_name']}")


def create_workflow_actions():
    """Create Self Approved action"""
    action = {"doctype": "Workflow Action", "action_name": "Self Approved"}
    
    if not frappe.db.exists("Workflow Action", "Self Approved"):
        doc = frappe.get_doc(action)
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("  ✓ Created Workflow Action: Self Approved")
    else:
        print("  • Action exists: Self Approved")


def create_workflow():
    """Create workflow with states and transitions"""

     # ADD THESE 3 LINES BEFORE workflow.insert():
    frappe.clear_cache()
    frappe.local.test_objects = {}
    frappe.db.commit()

    workflow = frappe.get_doc(
        {
            "doctype": "Workflow",
            "workflow_name": "Employee Material Request Workflow",
            "document_type": "Employee Material Request",
            "workflow_state_field": "status",
            "is_active": 1,
            "send_email_alert": 0,
            # States Table - All with System Manager role
            "states": [
                {
                    "state": "Draft",
                    "doc_status": "0",
                    "allow_edit": "System Manager",
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
                    "allow_edit": "System Manager",
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
                # {
                #     "state": "Self Approved",
                #     "doc_status": 1,
                #     "allow_edit": "System Manager",
                #     "update_field": "status",
                #     "update_value": "Self Approved",
                # },
            ],
            # Transitions Table - All with System Manager role
            "transitions": [
                {
                    "state": "Draft",
                    "action": "Submit",
                    "next_state": "Pending Reporting Person",
                    "allowed": "System Manager",
                    "allow_self_approval": 0,
                },
                {
                    "state": "Pending Reporting Person",
                    "action": "Approve",
                    "next_state": "Pending HO Approval",
                    "allowed": "System Manager",
                    "allow_self_approval": 0,
                },
                {
                    "state": "Pending Reporting Person",
                    "action": "Reject",
                    "next_state": "Rejected",
                    "allowed": "System Manager",
                    "allow_self_approval": 0,
                },
                
                {
                    "state": "Pending HO Approval",
                    "action": "Approve",
                    "next_state": "Approved",
                    "allowed": "System Manager",
                    "allow_self_approval": 0,
                },
                {
                    "state": "Pending HO Approval",
                    "action": "Reject",
                    "next_state": "Rejected",
                    "allowed": "System Manager",
                    "allow_self_approval": 0,
                },
                {
                    "state": "Rejected",
                    "action": "Submit",
                    "next_state": "Pending Reporting Person",
                    "allowed": "System Manager",
                    "allow_self_approval": 0,
                },
                {
                    "state": "Pending Reporting Person",
                    "action": "Self Approved",
                    "next_state": "Self Approved",
                    "allowed": "System Manager",
                    "allow_self_approval": 0,
                },
                {
                    "state": "Pending HO Approval",
                    "action": "Self Approved", 
                    "next_state": "Self Approved",
                    "allowed": "System Manager",
                    "allow_self_approval": 0,
                },
            ],
        }
    )

        # Skip link validation
    
    
    # Skip link validation
    workflow.flags.ignore_links = True
    workflow.flags.ignore_validate = True
    

    workflow.insert(ignore_permissions=True)
    print(f"  ✓ Created Workflow: {workflow.workflow_name}")
    print(f"  ✓ States: {len(workflow.states)}")
    print(f"  ✓ Transitions: {len(workflow.transitions)}")
