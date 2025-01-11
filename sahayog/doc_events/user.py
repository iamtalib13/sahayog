from __future__ import unicode_literals
import frappe
from frappe import _


def user_enable_disable(doc, method):
    # Fetch the 'enabled' field value from the User document
    status = doc.enabled

    # Fetch the 'name' field from the Employee document where the employee's user_id matches the 'doc' name
    employee_name = frappe.db.get_value('Employee', {'user_id': doc.name}, 'name')

    if employee_name:  # Check if employee_name is found
        # Get the current status of the employee
        current_status = frappe.db.get_value('Employee', employee_name, 'status')

        if status == 1:
            # Check if the status is already 'Active'
            if current_status != 'Active':
                # Set 'status' field to 'Active' for the Employee document when user is enabled
                frappe.db.set_value('Employee', employee_name, 'status', 'Active', update_modified=False)
                frappe.msgprint(f"Employee {employee_name} is now enabled and set to Active.")
            # else:
            #     frappe.msgprint(f"Employee {employee_name} is already Active.")

        elif status == 0:
            # Check if the status is already 'Inactive'
            if current_status != 'Inactive':
                # Set 'status' field to 'Inactive' for the Employee document when user is disabled
                frappe.db.set_value('Employee', employee_name, 'status', 'Inactive', update_modified=False)
                frappe.msgprint(f"Employee {employee_name} is now disabled and set to Inactive.")
            # else:
            #     frappe.msgprint(f"Employee {employee_name} is already Inactive.")
    else:
        frappe.msgprint(f"No employee found for User {doc.name}.")



def capital_user_name(doc, method):
    try:
        # Extract required fields from the passed 'doc' and convert them to uppercase
        first_name = doc.first_name.upper() if doc.first_name else ''
        middle_name = doc.middle_name.upper() if doc.middle_name else ''
        last_name = doc.last_name.upper() if doc.last_name else ''
        full_name = doc.full_name.upper() if doc.full_name else ''

        # Update the 'doc' with the uppercase names
        doc.first_name = first_name
        doc.middle_name = middle_name
        doc.last_name = last_name
        doc.full_name = full_name

    except Exception as e:
        # Log the error if any exception occurs
        frappe.log_error(message=str(e), title="Error in capital_user_name")
