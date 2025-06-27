import frappe

def execute():
    roles = [
        "Trainer",
        "Trainer Head",
        "Procurement User",
        "Branch Manager",
        "Cluster Manager",
        "Regional Manager",
        "Zonal Manager",
        "Audit Member",
        "Audit Manager",
        "Email Creator",
        "Team Leader - BOM",
        "BD-others",
        "IT Support Executive",
        "Admin Support Executive",
        "Operations Support Executive",
        "HR Support Executive",
        "Accounts Support Executive",
        "HO Support Executive",
        "Facility Support Executive",
        "Loan Support Executive",
        "Circular Manager",
        "Team Leader - DDS",
        "Team Leader - SMBG",
        "BDOs",
        "BDEs",
    ]

    for role in roles:
        if not frappe.db.exists("Role", role):
            frappe.get_doc({
                "doctype": "Role",
                "role_name": role,
                "desk_access": 1
            }).insert(ignore_permissions=True)
