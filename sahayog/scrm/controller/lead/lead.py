import frappe

# Function to update employee details in the Lead document
def update_employee_details(doc, method):
    if frappe.session.user != "Administrator":
        try:
            # Fetch employee_number and location fields using get_value with tuple unpacking
            result = frappe.db.get_value(
                "Employee",
                {"user_id": frappe.session.user},
                ["employee_number", "branch", "custom_region", "custom_zone"],
            )

            if not result:
                frappe.throw("Could not fetch employee details. Please ensure your employee profile is properly set.")

            employee_number, branch, region, zone = result

            # Always set employee number
            doc.custom_employee_id = employee_number

            # Conditionally set other fields if values are available
            if branch:
                doc.custom_branch = branch
            if region:
                doc.custom_region = region
            if zone:
                doc.custom_zone = zone

        except Exception:
            frappe.log_error(frappe.get_traceback(), "Lead Update Employee Details Error")
            frappe.throw("An error occurred while updating employee details.")

# Function to set the 'Is Operation Lead' field before saving the document
def set_is_operation_lead(doc, method):
    user = frappe.session.user

    # Skip Administrator
    if user == "Administrator":
        return

    roles = frappe.get_roles(user)

    # If user has the role "Operation Executive", set flag
    if "Operations Executive" in roles:
        doc.custom_is_operation_lead = 1
    else:
        doc.custom_is_operation_lead = 0
