import frappe

# Read/write rights for the approval flow:
# - Employee       : apni request bana sake (if_owner)
# - HR Manager/User: fallback / override approver
# - Accounts Manager: F&A approval
# - Travel Policy Approver: COO-level deviation approval
TRAVEL_REQUEST_ROLES = {
    "System Manager": {
        "read": 1, "write": 1, "create": 1, "delete": 1, "submit": 1,
        "cancel": 1, "amend": 1, "report": 1, "export": 1, "print": 1,
        "email": 1, "share": 1,
    },
    "Employee": {
        "read": 1, "write": 1, "create": 1, "print": 1, "email": 1,
        "report": 1, "share": 1, "if_owner": 1,
    },
    "HR Manager": {
        "read": 1, "write": 1, "create": 1, "submit": 1, "delete": 1,
        "report": 1, "export": 1, "print": 1, "email": 1, "share": 1,
    },
    "HR User": {
        "read": 1, "write": 1, "create": 1, "report": 1, "print": 1,
        "email": 1,
    },
    "Accounts Manager": {
        "read": 1, "write": 1, "submit": 1, "report": 1, "export": 1,
        "print": 1, "email": 1, "share": 1,
    },
    "Travel Policy Approver": {
        "read": 1, "write": 1, "report": 1, "print": 1, "email": 1,
    },
}

PURPOSE_OF_TRAVEL_ROLES = {
    "System Manager": {
        "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1,
        "export": 1, "print": 1, "email": 1, "share": 1,
    },
    "HR Manager": {
        "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1,
        "print": 1, "email": 1,
    },
    "HR User": {"read": 1, "write": 1, "create": 1, "print": 1},
    "Employee": {"read": 1},
    "Accounts Manager": {"read": 1},
}


def _set_permissions(doctype, role_permissions):
    # Custom DocPerm rows replace the standard DocPerm set for that doctype,
    # so every required role (including System Manager) must be present here.
    frappe.db.delete("Custom DocPerm", {"parent": doctype})

    for role, rights in role_permissions.items():
        values = {
            "doctype": "Custom DocPerm",
            "parent": doctype,
            "role": role,
            "permlevel": 0,
        }
        values.update(rights)
        frappe.get_doc(values).insert(ignore_permissions=True)


def execute():
    _set_permissions("Travel Request", TRAVEL_REQUEST_ROLES)
    _set_permissions("Purpose of Travel", PURPOSE_OF_TRAVEL_ROLES)
    frappe.clear_cache()
