import frappe

def execute():
    # Fetch the HR Settings document
    hr_settings = frappe.get_doc("HR Settings", "HR Settings")

    # Assign values to the fields
    hr_settings.emp_created_by = "Employee Number"
    hr_settings.leave_approval_notification_template = "Dispatch Notification"
    hr_settings.leave_status_notification_template = "Dispatch Notification"

    # Save the changes
    hr_settings.save()

    # Optionally, commit changes if needed
    frappe.db.commit()

    print("HR Settings updated successfully.")
