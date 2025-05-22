import frappe
from frappe.utils import getdate

def execute():
    sla_name = "Sahayog SLA"
    existing_sla = frappe.db.exists("CRM Service Level Agreement", sla_name)

    if existing_sla:
        # Load existing SLA
        sla_doc = frappe.get_doc("CRM Service Level Agreement", sla_name)
        print("Sahayog SLA already exists. Updating...")

        # Update fields
        sla_doc.apply_on = "CRM Lead"
        sla_doc.enabled = 1
        sla_doc.default = 1
        sla_doc.start_date = getdate("2025-04-24")
        sla_doc.end_date = getdate("2025-11-30")
        sla_doc.condition = "doc.sla_status == 'Open'"
        sla_doc.holiday_list = ""

        # Clear old priorities and working_hours
        sla_doc.set("priorities", [])
        sla_doc.set("working_hours", [])

        # Set new priorities
        sla_doc.append("priorities", {
            "priority": "Open",
            "first_response_time": 86400,
            "default_priority": 0,
        })

        # Set new working hours
        for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]:
            sla_doc.append("working_hours", {
                "workday": day,
                "start_time": "00:00:00",
                "end_time": "23:59:59"
            })

        sla_doc.save()
        frappe.db.commit()
        print("Sahayog SLA updated successfully.")
    else:
        # Create new SLA
        sla_doc = frappe.get_doc({
            "doctype": "CRM Service Level Agreement",
            "apply_on": "CRM Lead",
            "sla_name": sla_name,
            "enabled": 1,
            "default": 1,
            "start_date": getdate("2025-04-24"),
            "end_date": getdate("2025-11-30"),
            "condition": "doc.sla_status == 'Open'",
            "holiday_list": "",
            "priorities": [
                {
                    "priority": "Open",
                    "first_response_time": 86400,
                    "default_priority": 0,
                }
            ],
            "working_hours": [
                {"workday": day, "start_time": "00:00:00", "end_time": "23:59:59"}
                for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            ]
        })
        sla_doc.insert()
        frappe.db.commit()
        print("Sahayog SLA created successfully.")
