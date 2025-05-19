import frappe
from frappe.utils import getdate

def execute():
    # Check if SLA already exists
    if frappe.db.exists("CRM Service Level Agreement", "Sahayog SLA"):
        print("Sahayog SLA already exists.")
        return

    # Create SLA document
    sla_doc = frappe.get_doc({
        "doctype": "CRM Service Level Agreement",
        "apply_on": "CRM Lead",
        "sla_name": "Sahayog SLA",
        "enabled": 1,
        "default": 1,
        "start_date": getdate("2025-04-24"),  # Date only
        "end_date": getdate("2025-11-30"),
        "condition": "doc.sla_status == 'Open'",
        "holiday_list": "",  # Optional
        "priorities": [
            {
                "priority": "Open",
                "first_response_time": 60,
                "default_priority": 0,
            }
        ],
        "working_hours": [
            {"workday": day, "start_time": "05:36:59", "end_time": "23:36:59"}
            for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        ]
    })

    # Insert and commit
    sla_doc.insert()
    frappe.db.commit()
    print("Sahayog SLA created successfully")  # Informational
