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

        # Date of Birth validation
        if self.date_of_birth and frappe.utils.getdate(self.date_of_birth) > frappe.utils.getdate():
            frappe.throw("Date of Birth cannot be in the future")

        # CIBIL validation
        if self.cibil_score:
            if not (300 <= self.cibil_score <= 900 or self.cibil_score in [-1, 0]):
                frappe.throw(
                    "CIBIL Score must be between 300 and 900, or use -1 for No History or 0 for Not Checked."
                )

        # KYC Documents validation (Child Table)
        if not self.kyc_documents:
            frappe.throw("At least one KYC Document is required.")

        # Positive Value validations
        if self.loan_amount and self.loan_amount <= 0:
            frappe.throw("Loan Amount must be greater than zero")

        if self.tenure_months and self.tenure_months <= 0:
            frappe.throw("Tenure (Months) must be greater than zero")

        if self.gold_rate_per_gram and self.gold_rate_per_gram <= 0:
            frappe.throw("Gold Rate (per gram) must be greater than zero")

        # Loan Amount vs Eligible Amount validation
        if self.loan_amount and self.eligible_loan_amount:
            if self.loan_amount > self.eligible_loan_amount:
                frappe.throw(f"Loan Amount ({self.loan_amount}) cannot exceed the Eligible Loan Amount ({self.eligible_loan_amount})")

        # LTV Percent validation
        if self.ltv_percent and self.ltv_percent > 75:
            frappe.throw("LTV Percent (%) cannot exceed 75%")