import frappe
from frappe.model.document import Document
from frappe import _

class LoanDisbursement(Document):
    def validate(self):
        if self.loan_application:
            app_status = frappe.db.get_value("Loan Application", self.loan_application, "status")
            if app_status != "Approved":
                frappe.throw(_("Loan Disbursement can only be created for 'Approved' Loan Applications. Current application status is '{0}'.").format(app_status))

    def on_submit(self):
        if self.loan_application:
            # Update Loan Application status to Disbursed
            frappe.db.set_value("Loan Application", self.loan_application, "status", "Disbursed")
            frappe.msgprint(_("Linked Loan Application {0} status updated to 'Disbursed'.").format(self.loan_application))

    def on_cancel(self):
        if self.loan_application:
            # Revert Loan Application status to Approved if disbursement is cancelled
            frappe.db.set_value("Loan Application", self.loan_application, "status", "Approved")
            frappe.msgprint(_("Linked Loan Application {0} status reverted to 'Approved'.").format(self.loan_application))
