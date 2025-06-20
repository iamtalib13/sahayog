import frappe
from frappe.core.doctype.communication.email import make as original_make
from frappe.utils import cint

@frappe.whitelist()
def make(*args, **kwargs):
    """Override to set sender email from user_emails if available."""
    sender = kwargs.get("sender")

    if not sender:
        user_doc = frappe.get_doc("User", sender)
        
        # Fetch the first email from user_emails list
        user_email_entry = next((entry.email_id for entry in user_doc.user_emails), None)

        if user_email_entry:
            sender = user_email_entry
            frappe.log_error(f"Sender overridden with user email: {sender}", "Custom Email Sender")
        
        kwargs["sender"] = sender

    # Log final sender before sending
    frappe.log_error(f"Final Sender: {sender}", "Custom Email Sender")

    # Call original make method
    return original_make(*args, **kwargs)
