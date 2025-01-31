import re
import frappe
from frappe import _
from frappe.model.document import Document

class LetterOfIntent(Document):
    
    def validate(self):
        self.validate_aadhar_number()

    def validate_aadhar_number(self):
        aadhar_number = self.aadhar_number

        if not aadhar_number:
            frappe.throw(_("Aadhar number is required."))

        # Single regex check: 4 digits, space, 4 digits, space, 4 digits (not starting with 0 or 1)
        if not re.match(r'^[2-9]\d{3} \d{4} \d{4}$', aadhar_number):
            frappe.throw(_("Aadhar number should have 12 digits in the format 'XXXX XXXX XXXX' and should not start with 0 or 1."))
