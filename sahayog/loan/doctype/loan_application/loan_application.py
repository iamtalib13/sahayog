import frappe
from frappe.model.document import Document
from frappe.utils import flt, getdate, date_diff, nowdate, fmt_money
from frappe import _
import re

class LoanApplication(Document):
    def validate(self):
        self.set_branch_code_from_employee()
        self.set_lead_converter_from_user()
        self.validate_workflow_requirements()
        self.validate_basic_fields()
        if self.loan_type:
            self.run_rule_engine()
        self.calculate_payouts()

    def set_lead_converter_from_user(self):
        # Auto-set Lead Converter (LC) from current user
        if not self.lead_converter:
            emp = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, ["name", "employee_name"], as_dict=True)
            if emp:
                self.lead_converter = emp.name
                self.lead_converter_name = emp.employee_name
        elif self.lead_converter and not self.lead_converter_name:
            emp_name = frappe.db.get_value("Employee", self.lead_converter, "employee_name")
            if emp_name:
                self.lead_converter_name = emp_name

        # Auto-set Lead Generator (LG) details from creator/owner Employee record
        creator_user = self.owner if not self.is_new() else frappe.session.user
        emp_doc = frappe.db.get_value("Employee", {"user_id": creator_user}, ["name", "employee_name"], as_dict=True)
        if emp_doc:
            if not self.lead_generator_code:
                self.lead_generator_code = emp_doc.name
            if not self.lead_generator:
                self.lead_generator = emp_doc.employee_name

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
            valuation_docs = ["Valuation Report Image", "Ornament Image"]
            existing_docs = [d.document_type for d in self.kyc_documents]
            for doc_type in valuation_docs:
                if doc_type not in existing_docs:
                    self.append("kyc_documents", {
                        "document_type": doc_type,
                        "status": "Pending"
                    })

        # Credit Decision Logic
        if self.status == "Credit Decision" and self.security_type == "Gold":
            if not self.ornaments_list:
                frappe.throw(_("Ornaments List is mandatory when status is 'Credit Decision'."))
            
            if self.meta.has_field("valuer") and not self.get("valuer"):
                frappe.throw(_("Valuer is mandatory when adding valuation details."))
            
            if not self.disclaimer:
                frappe.throw(_("The Member Declaration (Disclaimer) checkbox is mandatory when status is 'Credit Decision'."))
            
            # Add Ornament Image to KYC if not present
            has_ornament_image = any(d.document_type == "Ornament Image" for d in self.kyc_documents)
            if not has_ornament_image:
                self.append("kyc_documents", {
                    "document_type": "Ornament Image",
                    "status": "Pending"
                })

        # Valuer Mandatory Check for Branch Team
        if self.security_type == "Gold" and self.ornaments_list:
            branch_roles = {"Branch Loan User", "Branch Manager"}
            user_roles = set(frappe.get_roles(frappe.session.user))
            if self.meta.has_field("valuer") and branch_roles.intersection(user_roles) and not self.get("valuer"):
                frappe.throw(_("Valuer is mandatory when adding valuation details."))

        # CPC Processing Logic
        if self.status == "CPC Processing":
            required_docs = ["Loan Agreement", "Sanction Letter"]
            existing_docs = [d.document_type for d in self.kyc_documents]
            for doc_type in required_docs:
                if doc_type not in existing_docs:
                    self.append("kyc_documents", {
                        "document_type": doc_type,
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
                    
        # Father/Husband Name Validation (Naya Code)
        if self.father_husband_name:
            # Sirf alphabets aur spaces allow karne ke liye (Optional validation)
            if re.search(r"[^a-zA-Z\s]", self.father_husband_name):
                frappe.throw(_("Father/Husband Name should only contain alphabets and spaces."))
            
            # Har word ka pehla letter capital karne ke liye
            self.father_husband_name = self.father_husband_name.title()

        # KYC Check
        if not self.kyc_documents:
            frappe.throw(_("At least one KYC Document is required."))
        self.validate_kyc_documents()

    def run_rule_engine(self):
        if not self.loan_type: return
        policy = frappe.get_doc("Loan Type", self.loan_type)
        age = date_diff(nowdate(), self.date_of_birth) / 365.25

        # Layer 1: Gates
        if age < 18:
            self.rule_engine_status = _("Rejected: Min age required (18)")
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

        if "Rejected" not in str(self.rule_engine_status):
            self.rule_engine_status = "Passed" if score >= 40 else "Referred for Review"

    def calculate_payouts(self):
        if not self.loan_type:
            return

        if self.security_type == "Gold" and self.ornaments_list:
            t_gw = 0
            t_ded = 0
            t_nw = 0
            t_val = 0

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

    def validate_kyc_documents(self):
        types = []
        for d in self.kyc_documents:
            if d.document_type in types:
                frappe.throw(_("Duplicate KYC Type: {0}").format(d.document_type))
            types.append(d.document_type)

    @frappe.whitelist()
    def stamp_sanctioned_user(self, status):
        """Directly writes the logged-in user to the DB, bypassing frontend read-only rules."""
        if status == "Credit Decision":
            frappe.db.set_value(self.doctype, self.name, "credit_sanctioned_by", frappe.session.user)
        elif status == "CPC Processing":
            frappe.db.set_value(self.doctype, self.name, "cpc_sanctioned_by", frappe.session.user)

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


@frappe.whitelist()
def get_branch_loan_user_employees(doctype, txt, searchfield, start, page_len, filters):
    """Custom link query to return only active Employees having 'Branch Loan User' role."""
    return frappe.db.sql("""
        SELECT e.name, e.employee_name
        FROM `tabEmployee` e
        JOIN `tabHas Role` hr ON hr.parent = e.user_id
        WHERE hr.role = 'Branch Loan User'
          AND e.status = 'Active'
          AND (e.name LIKE %(txt)s OR e.employee_name LIKE %(txt)s)
        ORDER BY e.employee_name ASC
        LIMIT %(start)s, %(page_len)s
    """, {
        "txt": f"%{txt}%",
        "start": start,
        "page_len": page_len
    })
