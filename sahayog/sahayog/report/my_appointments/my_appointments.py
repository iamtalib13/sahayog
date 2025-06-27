# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    user = frappe.session.user

    columns = [
        {"label": "Appointment ID", "fieldname": "name", "fieldtype": "Link", "options": "Appointment", "width": 150},
        {"label": "Customer Name", "fieldname": "customer_name", "fieldtype": "Data", "width": 200},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
        {"label": "Appointment With", "fieldname": "appointment_with", "fieldtype": "Data", "width": 180},
        {"label": "Lead ID", "fieldname": "party", "fieldtype": "Dynamic Link", "options": "appointment_with", "width": 180},
        {"label": "Created On", "fieldname": "creation", "fieldtype": "Datetime", "width": 180},
    ]

    data = frappe.get_all(
        "Appointment",
        fields=[col["fieldname"] for col in columns],
        filters={"owner": user},
        order_by="creation desc"
    )
    

    return columns, data