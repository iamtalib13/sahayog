import frappe
from frappe.core.doctype.report.report import Report

class CustomReport(Report):
    """
    Override Report doctype to prevent prepared_report from being set to 1
    """
    
    def validate(self):
        """
        Force prepared_report to 0 before save
        """
        # Call parent validate first
        super(CustomReport, self).validate()
        
        # Force prepared_report to 0
        # Remove condition if you want ALL reports to never use prepared report
        self.prepared_report = 0
    
    def before_save(self):
        """
        Additional check before save
        """
        super(CustomReport, self).before_save()
        self.prepared_report = 0
