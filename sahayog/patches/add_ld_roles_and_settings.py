# Copyright (c) 2026, Developer Team
# Patch: Add L&D roles (L&D Admin, L&D Viewer) to Frappe roles if not exists

import frappe


def execute():
    roles_to_create = [
        {"role_name": "L&D Admin", "desk_access": 1},
        {"role_name": "L&D Viewer", "desk_access": 1},
    ]

    for role_def in roles_to_create:
        if not frappe.db.exists("Role", role_def["role_name"]):
            role = frappe.new_doc("Role")
            role.role_name = role_def["role_name"]
            role.desk_access = role_def["desk_access"]
            role.insert(ignore_permissions=True)
            frappe.db.commit()
            print(f"Created role: {role_def['role_name']}")
        else:
            print(f"Role already exists: {role_def['role_name']}")
