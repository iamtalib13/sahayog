import frappe

def get_context(context):
    # This ensures Frappe JS is loaded
    context.no_cache = 1
    
    # Check if user is logged in
    if frappe.session.user == 'Guest':
        frappe.throw("Please login to access this page", frappe.PermissionError)
    
    return context
