import frappe
from frappe.model.document import Document
from frappe import _

class LoanRepayment(Document):
    def validate(self):
        if self.loan_application:
            app_status = frappe.db.get_value("Loan Application", self.loan_application, "status")
            if app_status != "Disbursed":
                frappe.throw(_("Loan Repayment can only be created for 'Disbursed' Loan Applications. Current status is '{0}'.").format(app_status))
