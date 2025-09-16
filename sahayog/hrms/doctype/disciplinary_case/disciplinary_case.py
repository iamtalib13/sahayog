# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DisciplinaryCase(Document):
    def before_insert(self):
        user = frappe.session.user
        hr_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
        if hr_employee:
            self.hr_employee_id = hr_employee
        else:
            frappe.msgprint("Please set User ID in Employee record.")

    def after_insert(self):
        # Set case_id = name after record is created
        self.db_set("case_id", self.name, update_modified=False)

