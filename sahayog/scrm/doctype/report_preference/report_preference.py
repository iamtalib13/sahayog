import frappe
from frappe.model.document import Document

class ReportPreference(Document):

    def autoname(self):
        """
        Naming format:
        <Report Type>-<User>
        Example: Lead-8751@sahayog.com
        """
        if self.report_type and self.user:
            self.name = f"{self.report_type}-{self.user}"
        else:
            frappe.throw("Report Type and User are required for naming")
