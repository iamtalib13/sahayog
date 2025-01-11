from __future__ import unicode_literals
import frappe
from frappe import _

def create_user(doc, method):
    if doc.custom_skip_auto_creation != 0:
        # Exit if custom_skip_auto_creation is not 0
        return

    try:
        first_name = doc.first_name
        middle_name = doc.middle_name
        last_name = doc.last_name
        role_profile = "Employee"
        employee_number = doc.employee_number
        module_profile = "Employee"

        email = f"{employee_number}@sahayog.com"

        # Check if a user with the same email already exists
        if frappe.db.exists('User', {'email': email}):
            frappe.throw(f"User with email {email} already exists.")

        # Check if the employee exists before creating the user
        if not frappe.db.exists('Employee', {'employee_number': employee_number}):
            frappe.throw(f"Employee with employee_number {employee_number} not found.")

        # Create a new User document
        user_doc = frappe.new_doc('User')
        user_doc.first_name = first_name
        user_doc.middle_name = middle_name
        user_doc.last_name = last_name
        user_doc.role_profile_name = role_profile
        user_doc.email = email
        user_doc.username = employee_number
        user_doc.send_welcome_email = 0
        user_doc.new_password = "saha123"
        user_doc.module_profile = module_profile

        user_doc.insert()
        # Update the corresponding Employee document with the new user_id (email)
        if frappe.db.exists('Employee', {'employee_number': employee_number}):
            employee_doc = frappe.get_doc('Employee', {'employee_number': employee_number})
            employee_doc.user_id = user_doc.name  # Assuming 'user_id' is the field in the Employee doctype
            employee_doc.save()
            frappe.msgprint(f"Employee record updated with user_id: {user_doc.name}")
        print(f"Employee record updated with user_id: {user_doc.name}")

        frappe.db.commit()

    except frappe.exceptions.ValidationError as e:
        frappe.throw(_("Validation Error: ") + str(e))
    except frappe.exceptions.DuplicateEntryError as e:
        frappe.throw(_("Duplicate Entry: ") + str(e))
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(message=str(e), title="Error creating user")
        frappe.throw(_("An unexpected error occurred: ") + str(e))





# def execute():
#     # Fetch all Employee documents without permission checks
#     employees = frappe.get_all('Employee', fields=['employee_number', 'name'])

#     for employee in employees:
#         # Update the 'name' field to be the employee_number for each employee, ignoring permissions
#         frappe.db.set_value("Employee", employee.name, "name", employee.employee_number, update_modified=False)
#         frappe.db.set_value("Employee", employee.employee, "employee", employee.employee_number, update_modified=False)
        
#         # Print that the specific employee has been updated
#         print(f"Employee {employee.employee_number} (Name: {employee.name}) updated successfully.")
    
#     frappe.db.commit()
    
#     # Print success message after updating all employees
#     print(_("Successfully updated the 'name' and 'employee' fields for all employees."))
