import frappe
from frappe.model.document import Document
from frappe import _  # Yeh missing tha, isliye error aa sakta hai
import re

class LoanApplication(Document):

    def before_save(self):
        if self.customer_name:
            self.customer_name = self.customer_name.title()

    def validate(self):
        # 1. Mobile validation (Merged & Cleaned)
        if self.mobile_number:
            # Starts with 6-9 and exactly 10 digits
            if not re.match(r"^[6-9]\d{9}$", str(self.mobile_number)):
                frappe.throw(_("Please enter a valid 10-digit mobile number starting with 6-9."))

        # 2. Customer Name validation
        if self.customer_name:
            if re.search(r"[^a-zA-Z\s]", self.customer_name):
                frappe.throw(_("Customer Name should only contain alphabets and spaces."))

        # 3. Date of Birth validation
        if self.date_of_birth and frappe.utils.getdate(self.date_of_birth) > frappe.utils.getdate():
            frappe.throw(_("Date of Birth cannot be in the future."))

        # 4. CIBIL validation
        if self.cibil_score is not None:
            if not (300 <= self.cibil_score <= 900 or self.cibil_score in [-1, 0]):
                frappe.throw(
                    _("CIBIL Score must be between 300 and 900, or use -1 for No History or 0 for Not Checked.")
                )

        # 5. KYC Documents check
        if not self.kyc_documents:
            frappe.throw(_("At least one KYC Document is required."))
        
        # 6. Call Child Table Deep Validation
        self.validate_kyc_documents()

        # 7. Positive Value validations
        if self.loan_amount and self.loan_amount <= 0:
            frappe.throw(_("Loan Amount must be greater than zero."))

        if self.tenure_months and self.tenure_months <= 0:
            frappe.throw(_("Tenure (Months) must be greater than zero."))

        if self.gold_rate_per_gram and self.gold_rate_per_gram <= 0:
            frappe.throw(_("Gold Rate (per gram) must be greater than zero."))

        # 8. Loan Amount vs Eligible Amount
        if self.loan_amount and self.eligible_loan_amount:
            if self.loan_amount > self.eligible_loan_amount:
                frappe.throw(_("Loan Amount ({0}) cannot exceed the Eligible Loan Amount ({1})").format(self.loan_amount, self.eligible_loan_amount))

        # 9. LTV Percent validation
        if self.ltv_percent and self.ltv_percent > 75:
            frappe.throw(_("LTV Percent (%) cannot exceed 75%."))

    def validate_kyc_documents(self):
        doc_types_in_table = []

        for doc in self.kyc_documents:
            # Document Number check
            if not doc.document_type or not doc.document_number:
                frappe.throw(_("Row #{0}: Document Type and Number are required.").format(doc.idx))

            # Aadhaar Validation
            if doc.document_type == "Aadhaar Card":
                if not re.match(r"^\d{12}$", str(doc.document_number)):
                    frappe.throw(_("Row #{0}: Aadhaar Card must be exactly 12 digits.").format(doc.idx))

            # PAN Validation
            elif doc.document_type == "PAN Card":
                pan_val = str(doc.document_number).upper().strip()
                if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", pan_val):
                    frappe.throw(_("Row #{0}: Invalid PAN format (Example: ABCDE1234F).").format(doc.idx))
                doc.document_number = pan_val

            # Within-Table Duplicate Check
            if doc.document_type in doc_types_in_table:
                frappe.throw(_("Row #{0}: {1} is already added in this application.").format(doc.idx, doc.document_type))
            doc_types_in_table.append(doc.document_type)

            # Global Duplicate Check
            existing = frappe.db.exists("Loan Document", {
                "document_type": doc.document_type,
                "document_number": doc.document_number,
                "parent": ["!=", self.name]
            })
            if existing:
                frappe.throw(_("Row #{0}: This {1} number already exists in another application ({2}).").format(doc.idx, doc.document_type, existing))
