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

    def before_insert(self):
        # Naya record banate waqt check
        self.check_admin_access()

    def validate(self):
        # Har bar save/edit karte waqt check
        self.check_admin_access()
        self.validate_unique_preference()

    def check_admin_access(self):
        """
        Manager's requirement: Only Administrator and System Manager allowed.
        Additional changes: None (keeping logic restricted but existing code intact).
        """
        user = frappe.session.user
        allowed_roles = {"Administrator", "System Manager"}
        user_roles = set(frappe.get_roles(user))

        # Agar user Administrator nahi hai aur uske paas System Manager role bhi nahi hai
        if user != "Administrator" and not allowed_roles.intersection(user_roles):
            frappe.throw(
                _("Access Denied: Currently, only Administrators and System Managers are allowed to create or manage Report Preferences.")
            )

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