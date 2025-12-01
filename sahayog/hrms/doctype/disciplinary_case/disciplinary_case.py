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
    Return stages with their status + modified timestamp
    """
    all_stages = [
        "Disciplinary Case",
        "Suspension Process",
        "Response to SCN",
        "Unauthorized Absence",
        "Reminder Of Unauthorized Absence",
        "Domestic Enquiry",
        "Enquiry Reminder",
        "Case Closure",
    ]

    timeline = []

    for stage in all_stages:
        docname = frappe.db.exists(stage, {"case_id": case_id})

        if docname:
            doc = frappe.get_doc(stage, docname)
            docstatus = doc.docstatus or 0

            if docstatus == 1:
                timeline.append({
                    "stage": stage,
                    "status": "submitted",   # green
                    "modified": doc.modified
                })
            else:
                timeline.append({
                    "stage": stage,
                    "status": "saved",       # orange
                    "modified": doc.modified
                })
        else:
            timeline.append({
                "stage": stage,
                "status": "current",       # yellow
                "modified": None
            })

    return {"timeline": timeline}
