import frappe
from frappe.model.document import Document
import re
from frappe.utils import today


class LoanDocument(Document):

    def validate(self):

        if not self.document_type:
            frappe.throw("Document Type is required")

        if not self.document_number:
            frappe.throw("Document Number is required")

        # Aadhaar Validation
        if self.document_type == "Aadhaar":
            if not re.match(r"^\d{12}$", self.document_number):
                frappe.throw("Aadhaar Number must be 12 digits")

        # PAN Validation
        if self.document_type == "PAN":
            if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", self.document_number):
                frappe.throw("Invalid PAN Number format")

        # Duplicate Document Check (same type + same number in system)
        existing = frappe.db.exists(
            "Loan Document",
            {
                "document_type": self.document_type,
                "document_number": self.document_number,
                "name": ["!=", self.name]
            }
        )

        if existing:
            frappe.throw(f"{self.document_type} Number already exists in the system")

        # Same Document Type only once in same Loan Application
        if self.parent and self.parenttype == "Loan Application":
            for row in self.parent.kyc_documents:
                if row.name != self.name and row.document_type == self.document_type:
                    frappe.throw(
                        f"{self.document_type} already added for this loan application"
                    )

        # Verified Status Validation
        if self.status == "Verified":

            if not self.verified_by:
                frappe.throw("Please select Verified By")

            # Auto set verification date
            if not self.verification_date:
                self.verification_date = today()