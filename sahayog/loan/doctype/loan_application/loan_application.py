import frappe
from frappe.model.document import Document
import re

class LoanApplication(Document):
    def validate(self):
        # Validate only if mobile number is provided
        if self.mobile_number:
            if not re.match(r"^\d{10}$", str(self.mobile_number)):
                frappe.throw("Mobile Number must be exactly 10 digits")