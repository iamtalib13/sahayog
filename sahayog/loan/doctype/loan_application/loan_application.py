import frappe
from frappe.model.document import Document
from frappe.utils import flt, getdate, date_diff, nowdate, fmt_money
from frappe import _
import re

class LoanApplication(Document):
    def validate(self):
        self.set_branch_code_from_employee()
        self.validate_workflow_requirements()
        self.validate_basic_fields()
        if self.loan_type:
            self.run_rule_engine()
        self.calculate_payouts()

    def set_branch_code_from_employee(self):
        if "Branch Loan User" not in frappe.get_roles(frappe.session.user):
            return

        branch_code = get_current_user_branch_code()
        if branch_code:
            self.branch_code = branch_code

    def validate_workflow_requirements(self):
        # Initial status setup
        if self.is_new() and not self.status:
            self.status = "Draft"
        
        # Add default KYC documents if empty
        if self.is_new() and not self.kyc_documents:
            default_docs = ["Aadhaar Card", "PAN Card"]
            for doc_type in default_docs:
                self.append("kyc_documents", {
                    "document_type": doc_type,
                    "status": "Pending"
                })

        # Valuation Pending Logic
        if self.status == "Valuation Pending" and self.security_type == "Gold":
            if not self.ornaments_list:
                frappe.throw(_("Ornaments List is mandatory when status is 'Valuation Pending'."))
            
            # Add Ornament Image to KYC if not present
            has_ornament_image = any(d.document_type == "Ornament Image" for d in self.kyc_documents)
            if not has_ornament_image:
                self.append("kyc_documents", {
                    "document_type": "Ornament Image",
                    "status": "Pending"
                })

    def validate_basic_fields(self):
        # Mobile Validation
        if self.mobile_number:
            if not re.match(r"^[6-9]\d{9}$", str(self.mobile_number)):
                frappe.throw(_("Please enter a valid 10-digit mobile number starting with 6-9."))

        # Name Validation
        if self.customer_name:
            if re.search(r"[^a-zA-Z\s]", self.customer_name):
                frappe.throw(_("Customer Name should only contain alphabets and spaces."))
            self.customer_name = self.customer_name.title()

        # DOB Validation
        if self.date_of_birth:
            age = date_diff(nowdate(), self.date_of_birth) / 365.25
            if age < 18:
                frappe.throw(_("Applicant must be at least 18 years old."))
            
            if self.loan_type:
                policy = frappe.get_doc("Loan Type", self.loan_type)
                max_age = flt(policy.max_age_at_maturity) or 60
                tenure_years = (flt(self.tenure_months) or 0) / 12
                if age + tenure_years > max_age:
                    frappe.msgprint(_("Warning: Total age at maturity ({0}) exceeds policy limit ({1}) for {2}.").format(
                        round(age + tenure_years, 1), max_age, self.loan_type
                    ))

        # KYC Check
        if not self.kyc_documents:
            frappe.throw(_("At least one KYC Document is required."))
        self.validate_kyc_documents()

    def run_rule_engine(self):
        if not self.loan_type: return
        policy = frappe.get_doc("Loan Type", self.loan_type)
        age = date_diff(nowdate(), self.date_of_birth) / 365.25
        self.eligible_loan_amount = 0

        # Layer 1: Gates
        if age < (flt(policy.min_age) or 21):
            if not (age >= 18 and getattr(self, "has_co_applicant", False)):
                self.rule_engine_status = _("Rejected: Min age required")
                return

        # Layer 2: Scoring
        score = 0
        cibil = flt(self.cibil_score)
        if cibil >= 750: score += 25
        elif cibil >= 700: score += 15
        elif cibil >= 650: score += 8
        elif cibil > 0: score += 5
        
        income = flt(self.monthly_income) or 1
        foir = (flt(self.existing_emi) / income) * 100
        if foir <= 40: score += 30
        elif foir <= 50: score += 20
        elif foir <= 60: score += 10
        self.total_risk_score = score

        if score < flt(policy.min_passing_score):
            self.rule_engine_status = _("Rejected: Risk Score ({0}) below threshold").format(score)
            return

        # Layer 3: Eligibility
        multiplier = flt(policy.dds_multiplier) or 12
        dds_cap = flt(self.avg_monthly_dds) * multiplier * (flt(self.tenure_months) / 12)
        product_cap = flt(policy.maximum_loan_amount)
        
        if self.security_type != "Gold":
            final_eligible = min(dds_cap, product_cap)
            self.eligible_loan_amount = max(0, final_eligible)

        if "Rejected" not in str(self.rule_engine_status):
            self.rule_engine_status = "Passed" if score >= 40 else "Referred for Review"

    def calculate_payouts(self):
        if not self.loan_type:
            return

        policy = frappe.get_doc("Loan Type", self.loan_type)

        # ✅ GOLD LOAN LOGIC
        if self.security_type == "Gold" and self.ornaments_list:
            t_gw = 0
            t_ded = 0
            t_nw = 0
            t_val = 0
            ltv = flt(self.ltv_percent) or flt(policy.ltv_percent) or 75
            
            for d in self.ornaments_list:
                rate = flt(d.valuation_rate_per_gram)
                d.net_weight = flt(d.gross_weight) - flt(d.deduction)
                d.valuation = d.net_weight * rate
                
                t_gw += flt(d.gross_weight)
                t_ded += flt(d.deduction)
                t_nw += d.net_weight
                t_val += d.valuation
            
            self.total_gross_weight = t_gw
            self.total_deduction = t_ded
            self.total_net_weight = t_nw
            self.total_valuation = t_val
            self.eligible_loan_amount = t_val * (ltv / 100)

        # ✅ SANCTIONED AMOUNT (FOR ALL LOANS)
        self.sanctioned_loan_amount = min(
            flt(self.loan_amount),
            flt(self.eligible_loan_amount)
        )

        # ✅ CHARGES (on sanctioned amount)
        fees = (
            flt(self.sanctioned_loan_amount) * flt(self.processing_fee) / 100
        ) + flt(self.valuation_charges) + flt(self.stamp_duty)

        # ✅ FINAL DISBURSEMENT
        self.final_payout = flt(self.sanctioned_loan_amount) - fees

    def validate_kyc_documents(self):
        types = []
        for d in self.kyc_documents:
            if d.document_type in types:
                frappe.throw(_("Duplicate KYC Type: {0}").format(d.document_type))
            types.append(d.document_type)

@frappe.whitelist()
def add_workflow_comment(docname, comment):
    """Explicitly add a comment to the document timeline."""
    if docname and comment:
        doc = frappe.get_doc("Loan Application", docname)
        doc.add_comment("Comment", comment)
        return True
    return False


@frappe.whitelist()
def get_current_user_branch_code():
    employee = frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        ["name", "sol_id"],
        as_dict=True,
    )

    return employee.sol_id if employee and employee.sol_id else None
