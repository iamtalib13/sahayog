# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe


def get_context(context):
    context.no_cache = 1
    context.safe_render = False
    if frappe.session.user == "Guest":
        frappe.throw("Please login to access the L&D Training Dashboard.", frappe.PermissionError)
    roles = frappe.get_roles(frappe.session.user)
    is_admin = "L&D Admin" in roles or "System Manager" in roles or "Administrator" in roles
    if not is_admin:
        frappe.throw("L&D Training Dashboard is accessible to L&D Admin only.", frappe.PermissionError)
