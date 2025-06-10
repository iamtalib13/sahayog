
import frappe
from frappe.model.document import Document


class Lead(Document):
    def before_save(self):
        if not self.first_name and self.custom_full_name:
            self.first_name = self.custom_full_name

