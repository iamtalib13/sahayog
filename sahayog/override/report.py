import frappe
from frappe.core.doctype.report.report import Report


class CustomReport(Report):
    """Keep custom reports from enabling prepared reports."""

    def _disable_prepared_report(self):
        self.prepared_report = 0

    def validate(self):
        """Run standard validation, then force prepared_report off."""
        super(CustomReport, self).validate()

        # Standard Report has no before_save(), so keep this in validate.
        self._disable_prepared_report()
    
    def before_save(self):
        """Force prepared_report off before every save."""
        self._disable_prepared_report()
