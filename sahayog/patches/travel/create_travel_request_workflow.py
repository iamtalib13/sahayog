import frappe

WORKFLOW_NAME = "Travel Request Workflow"
DOCTYPE = "Travel Request"
STATE_FIELD = "workflow_state"

# Dedicated role so the policy deviation approver does not have to be a
# generic HR/Accounts role. Assign this role to the COO + the CXOs who sign
# off deviations (policy 3.13). It is created by this patch, so it has no
# users on a fresh site - assign it before using the deviation path.
ROLE_TRAVEL_POLICY_APPROVER = "Travel Policy Approver"

# state, doc_status, style, allow_edit
# `allow_edit` is mandatory on Workflow Document State. For Approved the
# document must not be editable by the requester or approvers, so it is
# limited to System Manager (i.e. effectively read only).
STATES = (
    ("Draft", "0", "Primary", "Employee"),
    ("Pending Reporting Manager", "0", "Warning", "Employee"),
    ("Pending F&A Approval", "0", "Warning", "Accounts Manager"),
    ("Pending COO Approval", "0", "Warning", ROLE_TRAVEL_POLICY_APPROVER),
    ("Approved", "1", "Success", "System Manager"),
    ("Rejected", "0", "Danger", "Employee"),
)

ACTIONS = (
    "Submit for Approval",
    "Approve",
    "Approve with Deviation",
    "Reject",
    "Approve Deviation",
    "Reject Deviation",
    "Resubmit",
    "HR Approve",
    "HR Approve with Deviation",
    "HR Reject",
)

MANAGER_CONDITION = (
    'frappe.db.get_value("Employee", '
    '{"user_id": frappe.session.user}, "name") == doc.reporting_manager'
)

# Hide approval buttons from the person who raised the request. Frappe also
# blocks self approval while applying the transition, but filtering it here
# keeps the button out of the form in the first place.
NOT_OWNER = "doc.owner != frappe.session.user"

# Approval transitions never allow self approval: the person who raised the
# request cannot approve it, even if they hold the approver role. Only the
# employee's own submit/resubmit actions set allow_self_approval.
TRANSITIONS = (
    # Draft -> reporting manager
    {
        "state": "Draft",
        "action": "Submit for Approval",
        "next_state": "Pending Reporting Manager",
        "allowed": "Employee",
        "allow_self_approval": 1,
    },
    # Reporting manager decisions
    {
        "state": "Pending Reporting Manager",
        "action": "Approve",
        "next_state": "Pending F&A Approval",
        "allowed": "Employee",
        "condition": f"{NOT_OWNER} and {MANAGER_CONDITION} and not doc.deviation_requested",
    },
    {
        "state": "Pending Reporting Manager",
        "action": "Approve with Deviation",
        "next_state": "Pending COO Approval",
        "allowed": "Employee",
        "condition": f"{NOT_OWNER} and {MANAGER_CONDITION} and doc.deviation_requested",
    },
    {
        "state": "Pending Reporting Manager",
        "action": "Reject",
        "next_state": "Rejected",
        "allowed": "Employee",
        "condition": f"{NOT_OWNER} and {MANAGER_CONDITION}",
    },
    # COO / CXO deviation review
    {
        "state": "Pending COO Approval",
        "action": "Approve Deviation",
        "next_state": "Pending F&A Approval",
        "allowed": ROLE_TRAVEL_POLICY_APPROVER,
        "condition": NOT_OWNER,
    },
    {
        "state": "Pending COO Approval",
        "action": "Reject Deviation",
        "next_state": "Rejected",
        "allowed": ROLE_TRAVEL_POLICY_APPROVER,
        "condition": NOT_OWNER,
    },
    # F&A final approval (submits the document)
    {
        "state": "Pending F&A Approval",
        "action": "Approve",
        "next_state": "Approved",
        "allowed": "Accounts Manager",
        "condition": NOT_OWNER,
    },
    {
        "state": "Pending F&A Approval",
        "action": "Reject",
        "next_state": "Rejected",
        "allowed": "Accounts Manager",
        "condition": NOT_OWNER,
    },
    # Employee fixes and resubmits a rejected request
    {
        "state": "Rejected",
        "action": "Resubmit",
        "next_state": "Draft",
        "allowed": "Employee",
        "allow_self_approval": 1,
    },
    # HR fallback, only at the first approval stage. This keeps requests from
    # getting stuck when Employee.reports_to is missing or the manager is
    # unavailable. Finance and COO decisions are not overridable by HR.
    {
        "state": "Pending Reporting Manager",
        "action": "HR Approve",
        "next_state": "Pending F&A Approval",
        "allowed": "HR Manager",
        "condition": f"{NOT_OWNER} and not doc.deviation_requested",
    },
    {
        "state": "Pending Reporting Manager",
        "action": "HR Approve with Deviation",
        "next_state": "Pending COO Approval",
        "allowed": "HR Manager",
        "condition": f"{NOT_OWNER} and doc.deviation_requested",
    },
    {
        "state": "Pending Reporting Manager",
        "action": "HR Reject",
        "next_state": "Rejected",
        "allowed": "HR Manager",
        "condition": NOT_OWNER,
    },
)


def _ensure_role():
    if not frappe.db.exists("Role", ROLE_TRAVEL_POLICY_APPROVER):
        frappe.get_doc(
            {
                "doctype": "Role",
                "role_name": ROLE_TRAVEL_POLICY_APPROVER,
                "desk_access": 1,
            }
        ).insert(ignore_permissions=True)


def _ensure_states():
    styles = {row[0]: row[2] for row in STATES}
    for state in styles:
        if not frappe.db.exists("Workflow State", state):
            frappe.get_doc(
                {
                    "doctype": "Workflow State",
                    "workflow_state_name": state,
                    "style": styles[state],
                }
            ).insert(ignore_permissions=True)


def _ensure_actions():
    for action in ACTIONS:
        if not frappe.db.exists("Workflow Action Master", action):
            frappe.get_doc(
                {
                    "doctype": "Workflow Action Master",
                    "workflow_action_name": action,
                }
            ).insert(ignore_permissions=True)


def execute():
    if not frappe.db.exists("DocType", DOCTYPE):
        return

    _ensure_role()
    _ensure_states()
    _ensure_actions()

    if frappe.db.exists("Workflow", WORKFLOW_NAME):
        frappe.delete_doc("Workflow", WORKFLOW_NAME, ignore_permissions=True, force=True)

    states = [
        {
            "state": state,
            "doc_status": doc_status,
            "allow_edit": allow_edit,
        }
        for state, doc_status, _style, allow_edit in STATES
    ]

    workflow = frappe.get_doc(
        {
            "doctype": "Workflow",
            "workflow_name": WORKFLOW_NAME,
            "document_type": DOCTYPE,
            "is_active": 1,
            # Show the workflow state instead of the raw Draft/Submitted status.
            "override_status": 1,
            "send_email_alert": 0,
            "workflow_state_field": STATE_FIELD,
            "states": states,
            "transitions": [
                {**transition, "allow_self_approval": transition.get("allow_self_approval", 0)}
                for transition in TRANSITIONS
            ],
        }
    )
    workflow.insert(ignore_permissions=True)

    # New requests must start in Draft so workflow action buttons appear.
    if frappe.db.exists("Custom Field", {"dt": DOCTYPE, "fieldname": STATE_FIELD}):
        frappe.db.set_value(
            "Custom Field",
            {"dt": DOCTYPE, "fieldname": STATE_FIELD},
            {"default": "Draft", "hidden": 1, "allow_on_submit": 1, "no_copy": 1},
        )

    frappe.clear_cache(doctype=DOCTYPE)
