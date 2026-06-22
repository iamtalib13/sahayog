import frappe
from frappe.model.naming import make_autoname

# UPDATED_BY_GEMINI_CLI_NAMING_FIX

def set_name_by_naming_series_override(doc, method=None):
    """Overrides the default naming behavior to set name as employee_number"""

    # Auto-generate 'P' series for Support Staff if employee_number is missing
    if doc.get("custom_is_support_staff") and not doc.employee_number:
        from frappe.model.naming import make_autoname
        series_name = make_autoname('P.#####') # Returns P.00001
        # Convert P.00001 to P1
        if '.' in series_name:
            prefix, number = series_name.split('.')
            doc.employee_number = f"P{int(number)}"
        else:
            doc.employee_number = series_name

    # If employee_number is set (either manually or by our P-series logic), 
    # force it as the document name
    if doc.employee_number:
        doc.name = doc.employee_number
    # If it's NOT a support staff and NO employee_number is provided, 
    # we DO NOT set doc.name, allowing Frappe to use the standard HR-EMP series.
