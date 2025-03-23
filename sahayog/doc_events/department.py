import frappe

def department_name(doc, method):
    """Overrides the default naming behavior to set name as department_name"""
    doc.name = doc.department_name