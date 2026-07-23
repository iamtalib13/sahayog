from __future__ import unicode_literals
import frappe
from frappe import _

def create_user(doc, method):
    if frappe.flags.in_import:
        return

    if doc.custom_skip_auto_creation != 0:
        return  # Skip if flagged

    try:
        first_name = doc.first_name
        middle_name = doc.middle_name
        last_name = doc.last_name
        employee_number = doc.employee_number
        email = f"{employee_number}@sahayog.com"
        module_profile = "Employee"
        
        # --- Check if User already exists ---
        if frappe.db.exists('User', {'email': email}) or frappe.db.exists('User', {'username': employee_number}):
            frappe.msgprint(f"User with email '{email}' or username '{employee_number}' already exists. Skipping creation.")
            return  # Exit without creating

        # --- Create User ---
        user_doc = frappe.new_doc('User')
        user_doc.first_name = first_name
        user_doc.middle_name = middle_name
        user_doc.last_name = last_name
        user_doc.email = email
        user_doc.username = employee_number
        user_doc.send_welcome_email = 0
        user_doc.new_password = employee_number
        user_doc.module_profile = module_profile
        # Assign roles
        roles_to_assign = ["Sales User", "Employee"]
        for r in roles_to_assign:
            user_doc.append("roles", {"role": r})

        user_doc.insert(ignore_permissions=True)

        # Link User to Employee
        doc.user_id = user_doc.name
        doc.save()

        frappe.msgprint(f"Employee record updated with user_id: {user_doc.name}")
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
