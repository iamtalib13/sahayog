# Copyright (c) 2025
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DisciplinaryCase(Document):

    def before_insert(self):
        user = frappe.session.user

        # If user is Administrator
        if user == "Administrator":
            self.hr_employee_id = "Administrator"
            self.hr_name = "Administrator"
            return

        hr_employee_data = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "employee_name"]
        )
        if hr_employee_data:
            self.hr_employee_id, self.hr_name = hr_employee_data
        else:
            frappe.throw("Please set User ID in Employee record.")

    def after_insert(self):
        # Set case_id = name after record is created
        self.db_set("case_id", self.name, update_modified=False)
@frappe.whitelist()
def get_case_stages(case_id):
    """
    Return stages with their status for timeline:
    - unsaved → current (yellow)
    - saved but not submitted → completed (orange)
    - submitted → completed (green)
    """
    all_stages = [
        "Disciplinary Case",
        "Suspension Process",
        "Response to SCN",
        "Unauthorized Absence",
        "Reminder of Unauthorized Absence",
        "Domestic Enquiry",
        "Enquiry Reminder",
        "Case Closure",
    ]

    timeline = []

    # Check each stage
    for stage in all_stages:
        docname = frappe.db.exists(stage, {"case_id": case_id})
        if docname:
            docstatus = frappe.db.get_value(stage, docname, "docstatus") or 0
            if docstatus == 1:
                timeline.append({"stage": stage, "status": "submitted"})  # green
            else:
                timeline.append({"stage": stage, "status": "saved"})  # orange
                break  # first unsubmitted stage = current
        else:
            timeline.append({"stage": stage, "status": "current"})  # yellow

    return {"timeline": timeline}
