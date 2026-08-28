from __future__ import unicode_literals
import frappe
from frappe import _

def create_user(doc, method=None):
    if doc.custom_skip_auto_creation != 0:
        return  # Skip if flagged

    try:
        first_name = doc.first_name
        middle_name = doc.middle_name
        last_name = doc.last_name
        employee_number = doc.employee_number
        if not employee_number:
            return

        email = f"{employee_number}@sahayog.com"
        module_profile = "Employee"
        
        # --- Check if User already exists ---
        existing_user = frappe.db.get_value("User", {"email": email}, "name") or frappe.db.get_value("User", {"username": employee_number}, "name")
        if existing_user:
            if not doc.user_id:
                frappe.db.set_value("Employee", doc.name, "user_id", existing_user, update_modified=False)
            return

        # --- Create User without setting default password ---
        user_doc = frappe.new_doc('User')
        user_doc.first_name = first_name
        user_doc.middle_name = middle_name
        user_doc.last_name = last_name
        user_doc.email = email
        user_doc.username = employee_number
        user_doc.send_welcome_email = 0
        user_doc.module_profile = module_profile
        
        # Link User to Employee BEFORE User insert so ERPNext's validate_employee_role finds the mapped employee
        user_name = email
        frappe.db.set_value("Employee", doc.name, "user_id", user_name, update_modified=False)
        doc.user_id = user_name

        # Assign roles
        roles_to_assign = ["Sales User", "Employee"]
        for r in roles_to_assign:
            user_doc.append("roles", {"role": r})

        user_doc.flags.ignore_permissions = True
        user_doc.flags.ignore_password_policy = True
        user_doc.insert(ignore_permissions=True)

    except Exception as e:
        frappe.log_error(message=f"Employee: {doc.name} - Error: {str(e)}", title="Error creating user from employee")

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
