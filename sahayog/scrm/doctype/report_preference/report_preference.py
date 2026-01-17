import frappe
from frappe.model.document import Document
from frappe import _


class ReportPreference(Document):

    def autoname(self):
        """
        Naming format:
        <Report Type>-<User>
        Example: Lead-8751@sahayog.com
        """
        if not self.report_type or not self.user:
            frappe.throw(_("Report Type and User are required"))

        self.name = f"{self.report_type}-{self.user}"

    def validate(self):
        self.validate_unique_preference()

    def validate_unique_preference(self):
        existing = frappe.db.exists(
            "Report Preference",
            {
                "user": self.user,
                "report_type": self.report_type,
                "name": ["!=", self.name],
            }
        )

        if existing:
            frappe.throw(
                _("Report Preference already exists for this user and report type.")
            )
