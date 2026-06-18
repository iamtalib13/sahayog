from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import getdate, add_days

def set_confirmation_date(doc, method):
    """Automatically set final_confirmation_date to 90 days after date_of_joining if empty."""
    if doc.date_of_joining and not doc.final_confirmation_date:
        doc.final_confirmation_date = add_days(doc.date_of_joining, 90)

def emp_enable_disable(doc, method):
    status = doc.status
    user = doc.user_id

    # Validate user_id
    if not user:
        frappe.throw("User ID is not set for this Employee.")

    if not frappe.db.exists("User", user):
        frappe.throw(f"User {user} does not exist.")

    try:
        if status == "Active":
            frappe.db.set_value('User', user, 'enabled', 1, update_modified=False)
            frappe.msgprint(f"User {user} is now enabled.")
        elif status == "Inactive":
            frappe.db.set_value('User', user, 'enabled', 0, update_modified=False)
            frappe.msgprint(f"User {user} is now disabled.")
        else:
            frappe.msgprint(f"Status '{status}' is not recognized. No changes applied.")
        
        # Commit the transaction to the database
        frappe.db.commit()
    
    except Exception as e:
        # Log the error in Error Log doctype and throw an exception
        frappe.log_error(f"Failed to update user status for {user}: {str(e)}", "User Status Update Error")
        frappe.throw("An error occurred while updating the user status.")

