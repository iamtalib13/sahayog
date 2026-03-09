import frappe
from frappe.model.document import Document
import re

class LoanApplication(Document):
    def validate(self):
        # Mobile validation
        if self.mobile_number:
            if not re.match(r"^\d{10}$", str(self.mobile_number)):
                frappe.throw("Mobile Number must be exactly 10 digits")
        
        # PAN / Aadhaar validation
        if self.is_new_customer and self.pan__aadhaar:
            val = self.pan__aadhaar.upper()
            is_pan = re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", val)
            is_aadhaar = re.match(r"^\d{12}$", val)

            # Ye check 'if self.pan__aadhaar' ke andar hona chahiye
            if not is_pan and not is_aadhaar:
                frappe.throw("Invalid PAN (ABCDE1234F) or Aadhaar (12 digits) format.")