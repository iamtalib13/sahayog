# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document


class DisciplinaryCase(Document):
    def before_insert(self):
        user = frappe.session.user
        
        # Fetch employee linked to current user
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            "name"   # better to use name (Employee ID)
        )
        
        if employee:
            self.case_raised_by = employee
        else:
            frappe.throw("No Employee record found for the current user.")

