# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt


import frappe
from frappe import _

def execute(filters=None):
    columns = [
        {"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 150},
        {"label": _("Count"), "fieldname": "count", "fieldtype": "Int", "width": 100}
    ]

    login_user = frappe.session.user

    data = frappe.db.sql("""
        SELECT status, COUNT(*) as count
        FROM `tabCRM Lead`
        WHERE owner = %s
        GROUP BY status
    """, (login_user,), as_dict=True)

    return columns, data
