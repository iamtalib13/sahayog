import frappe
from frappe.model.document import Document
import re

class LoanApplication(Document):

    def before_save(self):
        if self.customer_name:
            self.customer_name = self.customer_name.title()

    def validate(self):

        # Mobile validation
        if self.mobile_number:
            if not re.match(r"^\d{10}$", str(self.mobile_number)):
                frappe.throw("Mobile Number must be exactly 10 digits")

        # Customer Name validation
        if self.customer_name:
            if re.search(r"[^a-zA-Z\s]", self.customer_name):
                frappe.throw("Customer Name should only contain alphabets and spaces")

        # CIBIL validation
        if self.cibil_score:
            if not (300 <= self.cibil_score <= 900 or self.cibil_score in [-1, 0]):
                frappe.throw(
                    "CIBIL Score must be between 300 and 900, or use -1 for No History or 0 for Not Checked."
                )

        # KYC Documents validation (Child Table)
        if not self.kyc_documents:
            frappe.throw("At least one KYC Document is required.")