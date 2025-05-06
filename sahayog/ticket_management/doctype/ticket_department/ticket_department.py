import frappe
from frappe.model.document import Document

class TicketDepartment(Document):
    def before_save(self):
        # Ensure department_name is uppercase before saving
        if self.department_name:
            self.department_name = self.department_name.upper()

        # Ensure name is uppercase before saving
        if self.name:
            self.name = self.name.upper()

    def before_naming(self):
        # Ensure the name is set as uppercase based on department_name
        if self.department_name:
            self.name = self.department_name.upper()
