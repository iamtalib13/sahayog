import frappe

def get_context(context):
    context.user_roles = frappe.get_roles(frappe.session.user)
