import frappe
from frappe.model.document import Document
from frappe.utils import flt, getdate, date_diff, nowdate, fmt_money
from frappe import _
import re

class LoanApplication(Document):
    def validate(self):
        self.validate_workflow_stage()
        self.validate_basic_fields()
        if self.loan_type:
            self.run_rule_engine()
        self.calculate_payouts()

    def validate_workflow_stage(self):
        # Initial status setup
        if self.is_new() and not self.status:
            self.status = "Draft"
        
        # Submission check
        if self.docstatus == 1 and self.status != "Approved":
            frappe.throw(_("Loan Application must be in 'Approved' status before submission. Current status: {0}").format(self.status))

    def on_submit(self):
        # Final safety check
        if self.status != "Approved":
            frappe.throw(_("Cannot submit an unapproved application."))
        frappe.msgprint(_("Loan Application {0} has been submitted successfully.").format(self.name))

    def on_cancel(self):
        if self.status == "Closed":
            frappe.throw(_("Closed applications cannot be cancelled."))
        self.status = "Rejected"

    def validate_basic_fields(self):
        # Mobile Validation
        if self.mobile_number:
            if not re.match(r"^[6-9]\d{9}$", str(self.mobile_number)):
                frappe.throw(_("Please enter a valid 10-digit mobile number starting with 6-9."))

        # Name Validation
        if self.customer_name:
            if re.search(r"[^a-zA-Z\s]", self.customer_name):
                frappe.throw(_("Customer Name should only contain alphabets and spaces."))
            # Auto-title case
            self.customer_name = self.customer_name.title()

        # DOB Validation
        if self.date_of_birth and getdate(self.date_of_birth) > getdate():
            frappe.throw(_("Date of Birth cannot be in the future."))

        # KYC Check
        if not self.kyc_documents:
            frappe.throw(_("At least one KYC Document is required."))
        self.validate_kyc_documents()

        # Numeric Sanity
        for field in ["loan_amount", "tenure_months", "monthly_income"]:
            if flt(getattr(self, field, 0)) < 0:
                frappe.throw(_("{0} cannot be negative.").format(self.meta.get_label(field)))

    def run_rule_engine(self):
        if not self.loan_type: return
        
        policy = frappe.get_doc("Loan Type", self.loan_type)
        
        # --- LAYER 1: POLICY GATES ---
        age = date_diff(nowdate(), self.date_of_birth) / 365.25
        age_at_maturity = age + (flt(self.tenure_months) / 12)

        # Min Age with Exception (Rule 2.2.1)
        min_age = flt(policy.min_age) or 21
        if age < min_age:
            if age >= 18 and self.has_co_applicant:
                self.rule_engine_status = _("Referred: Exception (18-21 with Co-applicant)")
            else:
                self.rule_engine_status = _("Rejected: Min age {0} required").format(min_age)
                return

        # Max Age with Exception
        max_mat = flt(policy.max_age_at_maturity) or 60
        if age_at_maturity > max_mat:
            if age_at_maturity <= 62 and self.has_co_applicant:
                self.rule_engine_status = _("Referred: Exception (Maturity 60-62 with Co-applicant)")
            else:
                self.rule_engine_status = _("Rejected: Age at maturity exceeds {0}").format(max_mat)
                return

        # DDS Gap Gate
        max_gap = flt(policy.max_dds_gap_days) or 5
        if flt(self.dds_gap_days) > max_gap:
            self.rule_engine_status = _("Rejected: Poor DDS Regularity (Gaps > {0} days)").format(max_gap)
            return

        # --- LAYER 2: SCORING ---
        score = 0
        # CIBIL (Max 25)
        cibil = flt(self.cibil_score)
        if cibil >= 750: score += 25
        elif cibil >= 700: score += 15
        elif cibil >= 650: score += 8
        elif cibil > 0: score += 5
        
        # FOIR (Max 30)
        income = flt(self.monthly_income) or 1
        foir = (flt(self.existing_emi) / income) * 100
        if foir <= 40: score += 30
        elif foir <= 50: score += 20
        elif foir <= 60: score += 10
        
        self.total_risk_score = score

        # Check Min Passing Score
        if score < flt(policy.min_passing_score):
            self.rule_engine_status = _("Rejected: Risk Score ({0}) below threshold ({1})").format(score, policy.min_passing_score)
            return

        # --- LAYER 3: AMOUNT ELIGIBILITY (5 Constraints) ---
        # 1. Income-Based
        inc_rec = flt(policy.income_recognition_percent) or 30
        income_cap = flt(self.monthly_income) * flt(self.tenure_months) * (inc_rec / 100)
        
        # 2. FOIR-Based
        max_foir = flt(policy.max_foir_percent) or 50
        max_emi = (flt(self.monthly_income) * (max_foir / 100)) - flt(self.existing_emi)
        foir_cap = max_emi * flt(self.tenure_months)

        # 3. DDS-Based
        multiplier = flt(policy.dds_multiplier) or 12
        dds_cap = flt(self.avg_monthly_dds) * multiplier * (flt(self.tenure_months) / 12)

        # 4. Product Ceiling
        product_cap = flt(policy.maximum_loan_amount)

        # 5. Score-Based Haircut
        haircut = 1.0
        if score < 80:
            if score >= 70: haircut = flt(policy.score_70_79_cap_percent) / 100
            elif score >= 60: haircut = flt(policy.score_60_69_cap_percent) / 100
            elif score >= 55: haircut = flt(policy.score_55_59_cap_percent) / 100
            elif score >= 50: haircut = flt(policy.score_50_54_cap_percent) / 100
        score_cap = product_cap * (haircut or 1.0)

        # CALCULATE MINIMUM (Only if not Gold)
        if self.security_type != "Gold":
            final_eligible = min(income_cap, foir_cap, dds_cap, product_cap, score_cap)
            self.eligible_loan_amount = max(0, final_eligible)

        if "Rejected" not in str(self.rule_engine_status):
            self.rule_engine_status = "Passed" if score >= 40 else "Referred for Review"

        # Final Enforcement
        if flt(self.loan_amount) > flt(self.eligible_loan_amount) + 0.01: # Buffer for float precision
            frappe.throw(_("Requested amount ({0}) exceeds max eligibility ({1}).").format(
                fmt_money(self.loan_amount), fmt_money(self.eligible_loan_amount)))

    def calculate_payouts(self):
        if not self.loan_type: return
        
        policy = frappe.get_doc("Loan Type", self.loan_type)
        
        # Auto-fill rates from policy if blank
        if not self.interest_rate: self.interest_rate = policy.interest_rate
        if not self.processing_fee: self.processing_fee = policy.processing_fee
        if not self.valuation_charges: self.valuation_charges = policy.valuation_charges
        
        # Gold Valuation Logic
        if self.security_type == "Gold" and self.ornaments_list:
            t_gw = t_ded = t_nw = t_val = 0
            ltv = flt(self.ltv_percent) or flt(policy.ltv_percent) or 75
            rate = flt(self.gold_rate_per_gram)

            for d in self.ornaments_list:
                d.net_weight = flt(d.gross_weight) - flt(d.deduction)
                d.valuation = d.net_weight * rate
                d.eligible_amount = d.valuation * (ltv / 100)
                
                t_gw += flt(d.gross_weight)
                t_ded += flt(d.deduction)
                t_nw += d.net_weight
                t_val += d.valuation

            self.total_gross_weight = t_gw
            self.total_deduction = t_ded
            self.total_net_weight = t_nw
            self.total_valuation = t_val
            self.eligible_loan_amount = t_val * (ltv / 100)

        # Stamp Duty Calculation
        if flt(policy.stamp_duty_percent) > 0:
            self.stamp_duty = flt(self.loan_amount) * (flt(policy.stamp_duty_percent) / 100)

        # Final Payout
        fees = (flt(self.loan_amount) * flt(self.processing_fee) / 100) + flt(self.valuation_charges) + flt(self.stamp_duty)
        self.final_payout = flt(self.loan_amount) - fees

    def validate_kyc_documents(self):
        types = []
        for d in self.kyc_documents:
            if not d.document_type or not d.document_number:
                frappe.throw(_("Row {0}: KYC Type and Number are mandatory.").format(d.idx))
            
            # 🆔 Aadhaar Validation: Exactly 12 digits
            if d.document_type == "Aadhaar Card":
                if not re.match(r"^\d{12}$", str(d.document_number)):
                    frappe.throw(_("Row {0}: Aadhaar Card number must be exactly 12 digits.").format(d.idx))
            
            # 💳 PAN Card Validation: 5 letters + 4 digits + 1 letter
            elif d.document_type == "PAN Card":
                if not re.match(r"^[A-Z]{5}\d{4}[A-Z]{1}$", str(d.document_number).upper()):
                    frappe.throw(_("Row {0}: Invalid PAN Card format. Expected: 5 Letters, 4 Digits, 1 Letter (e.g., ABCDE1234F).").format(d.idx))

            if d.document_type in types:
                frappe.throw(_("Duplicate KYC Type: {0}").format(d.document_type))
            types.append(d.document_type)
