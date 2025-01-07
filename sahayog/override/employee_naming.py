import frappe

def set_name_by_naming_series_override(doc):
    """Overrides the default naming behavior to set name as employee_number"""
    if not doc.employee_number:
        frappe.throw(frappe._("Employee Number is mandatory"))

    doc.name = doc.employee_number