import frappe
from frappe.model.document import Document
from frappe import _

class LoanDisbursement(Document):
    def validate(self):
        self.check_application_status()

    def check_application_status(self):
        if self.loan_application:
            status = frappe.db.get_value("Loan Application", self.loan_application, "status")
            if status != "Approved":
                frappe.throw(_("Loan Application {0} must be in 'Approved' status for disbursement. Current status: {1}").format(self.loan_application, status))

    def on_submit(self):
        # Update Parent Application
        loan_app = frappe.get_doc("Loan Application", self.loan_application)
        loan_app.status = "Disbursed"
        # Set initial outstanding balance to the full loan amount
        loan_app.remaining_balance = loan_app.loan_amount
        loan_app.save()
        
        frappe.msgprint(_("Loan Application {0} marked as Disbursed. Outstanding balance initialized.").format(self.loan_application))

    def on_cancel(self):
        loan_app = frappe.get_doc("Loan Application", self.loan_application)
        loan_app.status = "Approved"
        loan_app.remaining_balance = 0
        loan_app.save()
