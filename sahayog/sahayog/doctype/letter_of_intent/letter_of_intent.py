import re
import frappe
from frappe import _
from frappe.model.document import Document

class LetterOfIntent(Document):
    
    def validate(self):
        """Validates Aadhar, Mobile, and PAN numbers before saving."""
        self.validate_aadhar_number()
        self.validate_mobile_number()
        self.validate_pan_number()

    def validate_aadhar_number(self):
        """Validate Aadhar Number format (XXXX XXXX XXXX)."""
        aadhar_number = self.aadhar_number

        if not aadhar_number:
            frappe.throw(_("Aadhar number is required."))

        if not re.match(r'^[2-9]\d{3} \d{4} \d{4}$', aadhar_number):
            frappe.throw(_("Aadhar number should have 12 digits in the format 'XXXX XXXX XXXX' and should not start with 0 or 1."))

    def validate_mobile_number(self):
        """Validate Mobile Number format (10 digits, starts with 6-9)."""
        mobile_number = self.mobile_number

        if not mobile_number:
            frappe.throw(_("Mobile number is required."))

        if not re.match(r'^[6789]\d{9}$', mobile_number):
            frappe.throw(_("Mobile number should be exactly 10 digits and start with 6, 7, 8, or 9."))

    def validate_pan_number(self):
        """Validate PAN Card format (ABCDE1234F)."""
        pan_number = self.pan_number

        if not pan_number:
            frappe.throw(_("PAN number is required."))

        # PAN Format: 5 uppercase letters, 4 digits, 1 uppercase letter, no spaces
        if not re.match(r'^[A-Z]{5}\d{4}[A-Z]$', pan_number):
            frappe.throw(_("PAN number should be in the format 'ABCDE1234F' (5 uppercase letters, 4 digits, 1 uppercase letter, no spaces)."))
