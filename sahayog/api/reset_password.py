import frappe
from frappe import _
from frappe.utils.password import check_password, update_password

@frappe.whitelist(allow_guest=False)
def custom_change_password(old_password: str, new_password: str):
    """Change password for the logged-in user after verifying old password."""
    user = frappe.session.user

    # Validation: Empty fields
    if not old_password or not new_password:
        return {
            "status": "error",
            "message": _("Old and new passwords are required.")
        }

    # Validate old password
    try:
        check_password(user, old_password)
    except frappe.AuthenticationError:
        return {
            "status": "error",
            "message": _("Incorrect old password.")
        }

    # Try updating password
    try:
        update_password(user, new_password)
        return {
            "status": "success",
            "message": _("Password updated successfully.")
        }
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Custom Password Change Failed")
        return {
            "status": "error",
            "message": _("Could not update password. Please try again later.")
        }
