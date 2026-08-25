# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe


def get_context(context):
    context.no_cache = 1
    context.safe_render = False
    if frappe.session.user == "Guest":
        frappe.throw("Please login to access the L&D Training Calendar.", frappe.PermissionError)