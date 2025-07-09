# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt
import re
import frappe
from frappe.model.document import Document

class BranchProposal(Document):
    def before_save(self):
        # Ensure total estimated cost is updated before saving
        self.set_total_estimated_cost()
 
    def validate(self):
        self.validate_form()
        # Get the expected count from main field
        expected = self.number_of_branches or 0

        # Get actual child table row count
        actual = len(self.planned_branches or [])

        if expected != actual:
            frappe.throw(
                f"⚠️ Number of Planned Branches ({actual}) does not match 'Number of Branches' ({expected})."
            )

    def set_total_estimated_cost(self):
        total = sum(row.estimated_cost or 0 for row in self.planned_branches)
        self.total_estimated_cost = total

    def validate_form(self):    
        pattern = re.compile("^[A-Za-z ]+$")

        # Validate and format city
        self.city = self.city.strip().title()
        if not pattern.match(self.city):
           frappe.throw("City should contain only alphabets and spaces. Special characters are not allowed.")

        # Validate each planned branch name in child table
        for row in self.planned_branches:
            if row.branch_name:
                row.branch_name = row.branch_name.strip().title()
                if not pattern.match(row.branch_name):
                    frappe.throw(
                        f"Branch Name '{row.branch_name}' in Planned Branches should contain only alphabets and spaces."
                    )