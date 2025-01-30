import re
import frappe
from frappe import _
from frappe.model.document import Document

class LetterOfIntent(Document):
    
    def validate(self):
        self.validate_aadhar_number()

    def validate_aadhar_number(self):
        aadhar_number = self.aadhar_number
        
        # Check if it has 12 digits with spaces after every 4 digits
        if len(aadhar_number) != 14:  # 12 digits + 3 spaces
            frappe.throw(_("Aadhar number should have 12 digits, with spaces after every 4 digits."))
        
        # Check if it starts with 0 or 1
        if aadhar_number[0] in ['0', '1']:
            frappe.throw(_("Aadhar number should not start with 0 or 1."))
        
        # Check if it contains only digits and spaces in the format: dddd dddd dddd
        if not re.match(r'^\d{4} \d{4} \d{4}$', aadhar_number):
            frappe.throw(_("Aadhar number should contain only digits and have spaces after every 4 digits."))
