import frappe
from frappe.model.document import Document
import re

class LoanApplication(Document):
    def validate(self):

        # Mobile validation
        if self.mobile_number:
            if not re.match(r"^\d{10}$", str(self.mobile_number)):
                frappe.throw("Mobile Number must be exactly 10 digits")

        # PAN validation
        if self.pan_number:
            if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", self.pan_number.upper()):
                frappe.throw("Invalid PAN format. Example: ABCDE1234F")

        # Aadhaar validation
        if self.aadhaar_number:
            if not re.match(r"^\d{12}$", str(self.aadhaar_number)):
                frappe.throw("Aadhaar Number must be exactly 12 digits")

        # At least one KYC required
        if not self.pan_number and not self.aadhaar_number:
            frappe.throw("Either PAN Number or Aadhaar Number is required.")
            
        if self.cibil_score and not (300 <= self.cibil_score <= 900 or self.cibil_score in [-1, 0]):
            frappe.throw("Invalid CIBIL Score. Please enter a value between 300 and 900.")