import frappe
from frappe.model.document import Document
import re
from frappe.utils import today


class LoanDocument(Document):

    def validate(self):

        if not self.document_type:
            frappe.throw("Document Type is required")

        dtype = (self.document_type or "").strip()
        dnum = (self.document_number or "").strip()

        # PAN normalize to uppercase (Indian rule: ABCDE1234F)
        if dtype == "PAN Card" and dnum:
            dnum = dnum.upper()
            self.document_number = dnum

        # Number mandatory only for Aadhaar & PAN (same as Loan Application JS)
        if dtype in ("Aadhaar Card", "PAN Card") and not dnum:
            frappe.throw(f"{dtype}: Document Number is required")

        # Aadhaar Validation (Indian rule: 12 digits, first 2-9)
        if dtype == "Aadhaar Card" and dnum:
            if not re.match(r"^[2-9]\d{11}$", dnum):
                frappe.throw("Aadhaar Number must be 12 digits starting with 2-9")

        # PAN Validation (Indian rule: 5 letters + 4 digits + 1 letter)
        if dtype == "PAN Card" and dnum:
            if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", dnum):
                frappe.throw("Invalid PAN Number format (e.g. ABCDE1234F)")

        # Duplicate Document Check (only when number present)
        if dnum:
            existing = frappe.db.exists(
                "Loan Document",
                {
                    "document_type": dtype,
                    "document_number": dnum,
                    "name": ["!=", self.name]
                }
            )

            if existing:
                frappe.throw(f"{dtype} Number already exists in the system")

        # Same Document Type only once per parent (Loan Application + Loan Request)
        if self.parent and self.parenttype in ("Loan Application", "Loan Request"):
            rows = []
            if self.parenttype == "Loan Application":
                rows = getattr(self.parent, "kyc_documents", []) or []
            else:
                rows = getattr(self.parent, "document_checklist", []) or []
            for row in rows:
                if row.name != self.name and (row.document_type or "").strip() == dtype:
                    frappe.throw(
                        f"{dtype} already added for this {self.parenttype.lower()}"
                    )

        # Verified Status Validation
        if self.status == "Verified":

            if not self.verified_by:
                frappe.throw("Please select Verified By")

            # Auto set verification date
            if not self.verification_date:
                self.verification_date = today()