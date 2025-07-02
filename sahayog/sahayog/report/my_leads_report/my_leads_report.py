# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    user = frappe.session.user
    columns = [
        {"label": "Lead ID", "fieldname": "name", "fieldtype": "Link", "options": "Lead", "width": 150},
        {"label": "Lead Name", "fieldname": "lead_name", "fieldtype": "Data", "width": 200},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
        {"label": "Source", "fieldname": "source", "fieldtype": "Data", "width": 120},
        {"label": "Mobile", "fieldname": "mobile_no", "fieldtype": "Data", "width": 120},
        {"label": "Created On", "fieldname": "creation", "fieldtype": "Datetime", "width": 180},
    ]

    data = frappe.get_all(
        "Lead",
        fields=[c["fieldname"] for c in columns],
        filters={"owner": user},
        order_by="creation desc"
    )

    return columns, data