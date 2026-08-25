import re
import frappe
from frappe import _
from frappe.utils import getdate, nowdate, add_days, cint

@frappe.whitelist()
def get_password_security_status(user=None):
    """
    Returns the password security and reset status for the given user (or session user).
    """
    if not user:
        user = frappe.session.user

    # Default payload for inactive or exempt users
    default_response = {
        "enabled": False,
        "reset_required": False,
        "show_reminder": False,
        "days_remaining": 0,
        "next_password_reset_date": None,
        "last_password_reset_on": None,
        "policy": {
            "min_password_length": 8,
            "require_uppercase": 1,
            "require_lowercase": 1,
            "require_number": 1,
            "allow_special_characters": 0,
        }
    }

    if not user or user in ("Guest", "Administrator"):
        return default_response

    settings = frappe.get_cached_doc("Sahayog Settings")
    if not settings.enable_mandatory_password_reset or not settings.next_password_reset_date:
        return default_response

    next_reset_date = getdate(settings.next_password_reset_date)
    today = getdate(nowdate())

    # Get user's last password reset date
    last_reset_on_raw = frappe.db.get_value("User", user, "last_password_reset_on")
    last_reset_on = getdate(last_reset_on_raw) if last_reset_on_raw else None

    policy = {
        "min_password_length": cint(settings.min_password_length) or 8,
        "require_uppercase": cint(settings.require_uppercase),
        "require_lowercase": cint(settings.require_lowercase),
        "require_number": cint(settings.require_number),
        "allow_special_characters": cint(settings.allow_special_characters),
    }

    reset_required = False
    show_reminder = False
    days_remaining = (next_reset_date - today).days

    # Mandatory Reset condition:
    # Today >= next_password_reset_date AND (last_reset is None or last_reset < next_password_reset_date)
    if today >= next_reset_date:
        if not last_reset_on or last_reset_on < next_reset_date:
            reset_required = True
    else:
        # Reminder condition before reset date
        reminder_days = cint(settings.password_reset_reminder_days) or 7
        reminder_start_date = add_days(next_reset_date, -reminder_days)
        if reminder_start_date <= today < next_reset_date:
            if not last_reset_on or last_reset_on < next_reset_date:
                show_reminder = True

    return {
        "enabled": True,
        "reset_required": reset_required,
        "show_reminder": show_reminder,
        "days_remaining": max(0, days_remaining),
        "next_password_reset_date": str(next_reset_date),
        "last_password_reset_on": str(last_reset_on) if last_reset_on else None,
        "policy": policy,
    }


def validate_password_policy(new_password, settings=None):
    """
    Validates a password against Sahayog Settings password policy.
    Throws ValidationError if any rule fails.
    """
    if not settings:
        settings = frappe.get_cached_doc("Sahayog Settings")

    min_length = cint(settings.min_password_length) or 8
    req_upper = cint(settings.require_uppercase)
    req_lower = cint(settings.require_lowercase)
    req_num = cint(settings.require_number)
    allow_special = cint(settings.allow_special_characters)

    if not new_password or len(new_password) < min_length:
        frappe.throw(
            _("Password must be at least {0} characters long.").format(min_length),
            title=_("Password Policy Violation")
        )

    if req_upper and not re.search(r"[A-Z]", new_password):
        frappe.throw(
            _("Password must contain at least one uppercase letter (A-Z)."),
            title=_("Password Policy Violation")
        )

    if req_lower and not re.search(r"[a-z]", new_password):
        frappe.throw(
            _("Password must contain at least one lowercase letter (a-z)."),
            title=_("Password Policy Violation")
        )

    if req_num and not re.search(r"[0-9]", new_password):
        frappe.throw(
            _("Password must contain at least one numeric digit (0-9)."),
            title=_("Password Policy Violation")
        )

    if not allow_special:
        # Only alphanumeric characters allowed
        if not re.match(r"^[a-zA-Z0-9]+$", new_password):
            frappe.throw(
                _("Special characters and spaces are not allowed in the password as per security policy."),
                title=_("Password Policy Violation")
            )


@frappe.whitelist()
def reset_user_password(old_password, new_password, confirm_password):
    """
    Whitelisted endpoint for a user to reset their own password.
    """
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)

    if not old_password:
        frappe.throw(_("Please enter your current password."))

    if not new_password:
        frappe.throw(_("Please enter a new password."))

    if new_password != confirm_password:
        frappe.throw(_("New password and confirm password do not match."))

    if old_password == new_password:
        frappe.throw(_("New password cannot be the same as your current password."))

    # Validate old password
    try:
        from frappe.utils.password import check_password
        check_password(user, old_password)
    except Exception:
        frappe.throw(_("The current password you entered is incorrect."), frappe.AuthenticationError)

    # Validate against policy
    settings = frappe.get_cached_doc("Sahayog Settings")
    validate_password_policy(new_password, settings)

    # Update password in Frappe Auth
    from frappe.utils.password import update_password
    update_password(user=user, pwd=new_password, logout_all_sessions=False)

    # Update user's last_password_reset_on
    frappe.db.set_value("User", user, "last_password_reset_on", frappe.utils.today())
    frappe.db.commit()

    return {
        "status": "success",
        "message": _("Password reset successful. You may now continue using Sahayog.")
    }


def boot_session(bootinfo):
    """
    Hook to attach password security state to bootinfo for desk sessions.
    """
    try:
        bootinfo.password_security = get_password_security_status()
    except Exception as e:
        frappe.logger().error(f"Error extending bootinfo for password security: {e}")
        bootinfo.password_security = {
            "enabled": False,
            "reset_required": False,
            "show_reminder": False
        }
