import frappe
from frappe.model.naming import make_autoname

# UPDATED_BY_GEMINI_CLI_NAMING_FIX

def set_name_by_naming_series_override(doc, method=None):
    """Overrides the default naming behavior to set name as employee_number"""

    # Auto-generate 'P' series for Support Staff if employee_number is missing
    if doc.get("custom_is_support_staff") and not doc.employee_number:
        # Get next number directly from tabSeries
        frappe.db.sql("INSERT INTO `tabSeries` (name, current) VALUES ('P.', 0) ON DUPLICATE KEY UPDATE current=current+1")
        current = frappe.db.sql("SELECT current FROM `tabSeries` WHERE name='P.'")[0][0]
        doc.employee_number = f"P{current}"

    # If employee_number is set (either manually or by our P-series logic), 
    # force it as the document name
    if doc.employee_number:
        doc.name = doc.employee_number
    # If it's NOT a support staff and NO employee_number is provided, 
    # we DO NOT set doc.name, allowing Frappe to use the standard HR-EMP series.
