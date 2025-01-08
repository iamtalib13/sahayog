from __future__ import unicode_literals
import frappe
from frappe import _


def emp_enable_disable(doc, method):
    status = doc.status
    user = doc.user_id

    if status == "Active":
        # Set 'enabled' field to 1 for the User document when status is Active
        frappe.db.set_value('User', user, 'enabled', 1, update_modified=False)
        frappe.msgprint(f"User {user} is now enabled.")

    elif status == "Inactive":
        # Set 'enabled' field to 0 for the User document when status is Inactive
        frappe.db.set_value('User', user, 'enabled', 0, update_modified=False)
        frappe.msgprint(f"User {user} is now disabled.")
