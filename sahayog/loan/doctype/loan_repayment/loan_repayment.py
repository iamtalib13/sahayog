import frappe
from frappe.model.document import Document
from frappe.utils import flt
from frappe import _

class LoanRepayment(Document):
    def validate(self):
        self.check_disbursement_status()
        self.validate_payment_amount()

    def before_save(self):
        # Record current balance before this payment
        if self.loan_application:
            self.before_balance = frappe.db.get_value("Loan Application", self.loan_application, "remaining_balance")
            self.remaining_balance = flt(self.before_balance) - flt(self.payment_amount)

    def check_disbursement_status(self):
        if self.loan_application:
            status = frappe.db.get_value("Loan Application", self.loan_application, "status")
            if status != "Disbursed":
                frappe.throw(_("Repayment can only be made for Disbursed loans. Current status: {0}").format(status))

    def validate_payment_amount(self):
        current_balance = frappe.db.get_value("Loan Application", self.loan_application, "remaining_balance")
        if flt(self.payment_amount) > flt(current_balance):
            frappe.throw(_("Payment Amount ({0}) cannot exceed the current outstanding balance ({1}).").format(
                self.payment_amount, current_balance
            ))
        if flt(self.payment_amount) <= 0:
            frappe.throw(_("Payment Amount must be greater than zero."))

    def on_submit(self):
        # Update Parent Application Balance
        loan_app = frappe.get_doc("Loan Application", self.loan_application)
        loan_app.remaining_balance = flt(loan_app.remaining_balance) - flt(self.payment_amount)
        
        # If balance is 0, Close the loan
        if flt(loan_app.remaining_balance) <= 0.01:
            loan_app.status = "Closed"
            frappe.msgprint(_("Loan Application {0} has been fully repaid and marked as Closed.").format(self.name))
        
        loan_app.save()

    def on_cancel(self):
        # Revert Balance
        loan_app = frappe.get_doc("Loan Application", self.loan_application)
        loan_app.remaining_balance = flt(loan_app.remaining_balance) + flt(self.payment_amount)
        
        # Revert status if it was closed
        if loan_app.status == "Closed":
            loan_app.status = "Disbursed"
            
        loan_app.save()
