import frappe

def execute():
    # Get the single record for System Settings
    system_settings = frappe.get_single("System Settings")

    # Check if the field is already True
    if system_settings.allow_login_using_user_name:
        print("allow_login_using_user_name is already set to True")
    else:
        # Set the allow_login_using_user_name field to True (checked)
        system_settings.allow_login_using_user_name = True

        # Save the changes
        system_settings.save()

        # Print success message
        print("allow_login_using_user_name has been set to True")
