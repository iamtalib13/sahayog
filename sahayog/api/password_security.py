import re
import secrets
import calendar
import datetime
import requests
import frappe
from frappe import _
from frappe.utils import getdate, nowdate, add_days, cint, now_datetime

SUPPORT_EMAIL = "apptech@sahayogmultistate.com"
OTP_CACHE_KEY_PREFIX = "sahayog_pwd_otp:"
OTP_COOLDOWN_KEY_PREFIX = "sahayog_pwd_otp_cooldown:"
FAILED_ATTEMPTS_PREFIX = "sahayog_otp_fails:"
MAX_ALLOWED_FAILS = 5
LOCKOUT_MINUTES = 15


def log_security_event(user, subject, content, status="Success", operation=None):
    """
    Creates an immutable audit trail entry in Frappe's Activity Log
    capturing timestamp, user, IP address, channel, and outcome.
    """
    try:
        ip = getattr(frappe.local, "request_ip", None) or "127.0.0.1"
        user_fullname = frappe.db.get_value("User", user, "full_name") or user

        log_doc = frappe.get_doc({
            "doctype": "Activity Log",
            "subject": subject,
            "content": content,
            "user": user,
            "full_name": user_fullname,
            "ip_address": ip,
            "status": status,
            "operation": operation or "Login",
            "communication_date": now_datetime(),
            "reference_doctype": "User",
            "reference_name": user
        })
        log_doc.flags.ignore_permissions = True
        log_doc.insert()
        frappe.db.commit()
    except Exception as e:
        frappe.logger().error(f"Failed to write Security Audit Log: {e}")


def create_system_sms_log(receiver_number, sms_message):
    """
    Creates an entry in Frappe's SMS Log DocType with 91 country code prefix.
    """
    try:
        digits_only = re.sub(r"\D", "", str(receiver_number))
        clean_10_digits = digits_only[-10:] if len(digits_only) >= 10 else digits_only
        formatted_number = f"91{clean_10_digits}"

        if frappe.db.exists("DocType", "SMS Log"):
            sl = frappe.new_doc("SMS Log")
            sl.sent_on = nowdate()
            sl.message = str(sms_message)
            sl.no_of_requested_sms = 1
            sl.requested_numbers = formatted_number
            sl.no_of_sent_sms = 1
            sl.sent_to = formatted_number
            sl.flags.ignore_permissions = True
            sl.insert()
            frappe.db.commit()
    except Exception as e:
        frappe.logger().error(f"Failed to create SMS Log entry: {e}")


def dispatch_sms_via_pinnacle_or_settings(receiver_number, sms_message):
    """
    Delivers SMS purely metadata-driven from Frappe's 'SMS Settings' DocType.
    Extracts gateway url, apikey, sender/header, dltentityid, dlttempid dynamically.
    """
    settings = frappe.get_cached_doc("SMS Settings")
    if not settings.sms_gateway_url:
        frappe.throw(_("SMS Gateway is not configured in SMS Settings."))

    digits_only = re.sub(r"\D", "", str(receiver_number))
    clean_10_digits = digits_only[-10:] if len(digits_only) >= 10 else digits_only
    number_with_91 = f"91{clean_10_digits}"

    # Extract all parameters metadata from SMS Settings
    params_dict = {}
    for p in settings.parameters:
        if p.parameter:
            params_dict[p.parameter.strip().lower()] = (p.value or "").strip()

    # Dynamic extraction of metadata keys
    api_key = params_dict.get("apikey") or params_dict.get("accesskey") or ""
    sender = params_dict.get("sender") or params_dict.get("header") or ""
    dlt_entity_id = params_dict.get("dltentityid") or params_dict.get("peid") or ""
    dlt_temp_id = params_dict.get("dlttempid") or params_dict.get("templateid") or ""
    msg_type = params_dict.get("messagetype") or "PM"

    if msg_type.upper() == "TXT":
        msg_type = "PM"

    # If Pinnacle JSON or generic API endpoint is configured
    if "pinnacle" in settings.sms_gateway_url.lower() or "json" in settings.sms_gateway_url.lower():
        endpoint = settings.sms_gateway_url.strip()
        payload = {
            "version": "1.0",
            "encrypt": "0",
            "accesskey": api_key,
            "messages": [
                {
                    "dest": [clean_10_digits],
                    "msg": sms_message,
                    "type": msg_type,
                    "header": sender,
                    "app_country": "1",
                    "country_cd": "91",
                    "dlt_entity_id": dlt_entity_id,
                    "dlt_template_id": dlt_temp_id
                }
            ]
        }

        response = requests.post(endpoint, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
        response.raise_for_status()
        res_json = response.json()
        if res_json.get("status", {}).get("code") not in ("200", 200):
            reason = res_json.get("status", {}).get("reason", "Gateway Rejected")
            raise Exception(f"SMS Gateway Rejection: {reason}")

        # Record standardized entry in SMS Log DocType
        create_system_sms_log(number_with_91, sms_message)
        return res_json
    else:
        # Fallback to standard core Frappe SMS dispatcher
        from frappe.core.doctype.sms_settings.sms_settings import send_sms
        send_sms(receiver_list=[clean_10_digits], msg=sms_message)
        create_system_sms_log(number_with_91, sms_message)
        return True


def get_employee_contact_details(user_identifier):
    if not user_identifier:
        frappe.throw(_("Please enter your registered Employee ID, Email, or Username."))

    user_identifier = user_identifier.strip()

    user_doc = frappe.db.get_value(
        "User",
        {"name": user_identifier, "enabled": 1},
        ["name", "email", "username", "full_name"],
        as_dict=True
    )

    if not user_doc:
        user_doc = frappe.db.get_value(
            "User",
            {"email": user_identifier, "enabled": 1},
            ["name", "email", "username", "full_name"],
            as_dict=True
        )
    if not user_doc:
        user_doc = frappe.db.get_value(
            "User",
            {"username": user_identifier, "enabled": 1},
            ["name", "email", "username", "full_name"],
            as_dict=True
        )

    if not user_doc:
        emp_user_id = frappe.db.get_value("Employee", {"name": user_identifier, "status": "Active"}, "user_id")
        if emp_user_id:
            user_doc = frappe.db.get_value(
                "User",
                {"name": emp_user_id, "enabled": 1},
                ["name", "email", "username", "full_name"],
                as_dict=True
            )

    if not user_doc:
        frappe.throw(
            _("No active user account found matching '{0}'.").format(user_identifier),
            title=_("User Not Found")
        )

    user = user_doc.name

    employee = frappe.db.get_value(
        "Employee",
        {"user_id": user, "status": "Active"},
        ["name", "employee_name", "cell_number", "company_email", "prefered_contact_email", "personal_email"],
        as_dict=True
    )

    if not employee and user_identifier:
        employee = frappe.db.get_value(
            "Employee",
            {"name": user_identifier, "status": "Active"},
            ["name", "employee_name", "cell_number", "company_email", "prefered_contact_email", "personal_email"],
            as_dict=True
        )

    if not employee:
        frappe.throw(
            _(
                "No active Employee profile found for your account. "
                "Please contact IT support at <a href='mailto:{0}'><b>{0}</b></a>."
            ).format(SUPPORT_EMAIL),
            title=_("Employee Profile Missing")
        )

    raw_cell = str(employee.cell_number or "").strip().replace(" ", "").replace("-", "")
    cleaned_mobile = re.sub(r"[^\d]", "", raw_cell) if raw_cell else ""

    email = (employee.company_email or employee.prefered_contact_email or employee.personal_email or user_doc.email or "").strip()

    if not cleaned_mobile and not email:
        frappe.throw(
            _(
                "Neither registered mobile number nor email found for your employee profile. "
                "Please contact IT support at <a href='mailto:{0}'><b>{0}</b></a> to update your details."
            ).format(SUPPORT_EMAIL),
            title=_("Contact Details Missing")
        )

    return user, employee, cleaned_mobile, email


def mask_mobile_number(mobile_no):
    if not mobile_no:
        return ""
    digits = re.sub(r"\D", "", mobile_no)
    if len(digits) >= 10:
        last4 = digits[-4:]
        return f"+91 ******{last4}"
    return "******" + mobile_no[-3:] if len(mobile_no) > 3 else "******"


def mask_email_address(email):
    if not email or "@" not in email:
        return ""
    parts = email.split("@")
    user_part = parts[0]
    domain_part = parts[1]
    if len(user_part) <= 2:
        masked_user = user_part[0] + "*"
    else:
        masked_user = user_part[:2] + "****" + user_part[-1]
    return f"{masked_user}@{domain_part}"


def calculate_monthly_reset_date(target_day, from_date=None):
    today = getdate(from_date) if from_date else getdate(nowdate())
    target_day = max(1, min(28, cint(target_day) or 1))

    def get_valid_date(year, month, day):
        last_day_of_month = calendar.monthrange(year, month)[1]
        actual_day = min(day, last_day_of_month)
        return datetime.date(year, month, actual_day)

    current_month_reset = get_valid_date(today.year, today.month, target_day)

    if today < current_month_reset:
        next_reset_date = current_month_reset
        prev_month = today.month - 1 if today.month > 1 else 12
        prev_year = today.year if today.month > 1 else today.year - 1
        cycle_start_date = get_valid_date(prev_year, prev_month, target_day)
    else:
        cycle_start_date = current_month_reset
        next_month = today.month + 1 if today.month < 12 else 1
        next_year = today.year if today.month < 12 else today.year + 1
        next_reset_date = get_valid_date(next_year, next_month, target_day)

    return cycle_start_date, next_reset_date


def check_is_current_password(user, new_password):
    try:
        from frappe.utils.password import check_password
        check_password(user, new_password, delete_tracker_cache=False)
        frappe.throw(
            _("You cannot reuse your current password. Please choose a different new password."),
            title=_("Password Already Used")
        )
    except frappe.AuthenticationError:
        pass


@frappe.whitelist(allow_guest=True)
def check_user_mobile_status(user_identifier=None):
    if not user_identifier:
        if frappe.session.user and frappe.session.user not in ("Guest", "Administrator"):
            user_identifier = frappe.session.user
        else:
            frappe.throw(_("Please provide an Employee ID or user ID."))

    settings = frappe.get_cached_doc("Sahayog Settings")
    allow_sms = bool(cint(getattr(settings, "enable_sms_otp", 1)))
    allow_email = bool(cint(getattr(settings, "enable_email_otp", 1)))

    user, employee, cell_no, email = get_employee_contact_details(user_identifier)
    return {
        "status": "success",
        "user": user,
        "employee_name": employee.employee_name,
        "has_mobile": bool(cell_no) and allow_sms,
        "masked_mobile": mask_mobile_number(cell_no) if (cell_no and allow_sms) else "",
        "has_email": bool(email) and allow_email,
        "masked_email": mask_email_address(email) if (email and allow_email) else "",
        "default_channel": "mobile" if (cell_no and allow_sms) else ("email" if (email and allow_email) else "mobile")
    }


@frappe.whitelist(allow_guest=True)
def send_password_reset_otp(user_identifier=None, channel="mobile"):
    if not user_identifier:
        if frappe.session.user and frappe.session.user not in ("Guest", "Administrator"):
            user_identifier = frappe.session.user
        else:
            frappe.throw(_("Please provide an Employee ID or user ID."))

    settings = frappe.get_cached_doc("Sahayog Settings")
    user, employee, cell_no, email = get_employee_contact_details(user_identifier)

    # Brute-force lockout check
    fails_key = f"{FAILED_ATTEMPTS_PREFIX}{user}"
    failed_count = cint(frappe.cache().get_value(fails_key))
    if failed_count >= MAX_ALLOWED_FAILS:
        log_security_event(
            user=user,
            subject=f"OTP Request Blocked (Account Locked)",
            content=f"User exceeded {MAX_ALLOWED_FAILS} failed OTP attempts. Locked out for {LOCKOUT_MINUTES} minutes.",
            status="Failed"
        )
        frappe.throw(
            _("Too many failed attempts. For security, your account is locked for {0} minutes. Please try later.").format(LOCKOUT_MINUTES),
            title=_("Account Temporarily Locked")
        )

    # Cooldown check (60s)
    cooldown_key = f"{OTP_COOLDOWN_KEY_PREFIX}{user}"
    if frappe.cache().get_value(cooldown_key):
        frappe.throw(_("An OTP was recently sent. Please wait 60 seconds before requesting a new OTP."))

    # Generate 4-digit numeric OTP
    otp = f"{secrets.randbelow(9000) + 1000}"
    expiry_minutes = cint(getattr(settings, "otp_expiry_minutes", 10)) or 10

    # Cache OTP
    cache_key = f"{OTP_CACHE_KEY_PREFIX}{user}"
    frappe.cache().set_value(cache_key, otp, expires_in_sec=expiry_minutes * 60)
    frappe.cache().set_value(cooldown_key, "1", expires_in_sec=60)

    # Deliver via Email or SMS
    if channel == "email":
        if not email:
            frappe.throw(_("No registered company email address found for this employee."))
        try:
            subject = _("Your MySahayog Account Verification OTP")
            message = f"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 500px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h3 style="color: #417c7d; margin-top: 0;">Password Reset Verification</h3>
                <p>Hello <strong>{employee.employee_name}</strong>,</p>
                <p>Your one-time verification code to reset your MySahayog Account password is:</p>
                <div style="font-size: 26px; font-weight: bold; color: #417c7d; letter-spacing: 4px; padding: 12px; background: #f4f8f8; text-align: center; border-radius: 6px; margin: 20px 0;">
                    {otp}
                </div>
                <p style="font-size: 13px; color: #666;">This code is valid for <strong>{expiry_minutes} minutes</strong>. Please do not share this OTP with anyone.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #999; margin-bottom: 0;">Mysahayog.com</p>
            </div>
            """
            frappe.sendmail(
                recipients=[email],
                subject=subject,
                message=message,
                now=True
            )
            success_msg = _("Verification OTP has been sent to your registered email {0}.").format(mask_email_address(email))
            
            log_security_event(
                user=user,
                subject="OTP Sent via Email",
                content=f"Password reset OTP generated and sent to registered email ({mask_email_address(email)}). Valid for {expiry_minutes} mins.",
                status="Success"
            )
        except Exception as e:
            frappe.logger().error(f"Failed to send email OTP to {email}: {e}")
            frappe.cache().delete_value(cooldown_key)
            frappe.cache().delete_value(cache_key)
            log_security_event(
                user=user,
                subject="Email OTP Dispatch Failed",
                content=f"Attempted to send OTP to {mask_email_address(email)} but failed: {str(e)}",
                status="Failed"
            )
            frappe.throw(
                _(
                    "Unable to deliver email OTP right now. Please contact IT support at "
                    "<a href='mailto:{0}' style='color: inherit; text-decoration: underline; font-weight: 600;'>{0}</a>."
                ).format(SUPPORT_EMAIL),
                title=_("Email Delivery Failed")
            )
    else:
        # Default: SMS channel (Matches exact DLT registered template)
        if not cell_no:
            frappe.throw(_("No registered mobile number found for this employee."))

        # Exact DLT Approved Template: OTP for Forgot Password Request is {#var#} -SAHAYOG MULTISTATE
        sms_message = f"OTP for Forgot Password Request is {otp} - SAHAYOG MULTISTATE"
        try:
            dispatch_sms_via_pinnacle_or_settings(cell_no, sms_message)
            success_msg = _("Verification OTP has been sent to your registered mobile {0}.").format(mask_mobile_number(cell_no))
            
            log_security_event(
                user=user,
                subject="OTP Sent via SMS",
                content=f"Password reset OTP generated and sent to registered cell number ({mask_mobile_number(cell_no)}). Valid for {expiry_minutes} mins.",
                status="Success"
            )
        except Exception as e:
            frappe.logger().error(f"Failed to send SMS to {cell_no}: {e}")
            frappe.cache().delete_value(cooldown_key)
            frappe.cache().delete_value(cache_key)

            log_security_event(
                user=user,
                subject="SMS OTP Dispatch Failed",
                content=f"Attempted to send SMS to {mask_mobile_number(cell_no)} but gateway failed: {str(e)}",
                status="Failed"
            )

            if not frappe.db.get_single_value("SMS Settings", "sms_gateway_url"):
                frappe.throw(
                    _(
                        "SMS Gateway is currently not configured. Please choose Email OTP or contact IT support at "
                        "<a href='mailto:{0}' style='color: inherit; text-decoration: underline; font-weight: 600;'>{0}</a>."
                    ).format(SUPPORT_EMAIL),
                    title=_("SMS Service Unavailable")
                )
            else:
                frappe.throw(
                    _(
                        "Unable to deliver OTP via SMS right now. Please choose Email OTP or contact IT support at "
                        "<a href='mailto:{0}' style='color: inherit; text-decoration: underline; font-weight: 600;'>{0}</a>."
                    ).format(SUPPORT_EMAIL),
                    title=_("SMS Delivery Failed")
                )

    return {
        "status": "success",
        "channel": channel,
        "message": success_msg,
        "masked_target": mask_email_address(email) if channel == "email" else mask_mobile_number(cell_no),
        "cooldown_seconds": 60,
        "expiry_minutes": expiry_minutes
    }


def verify_otp_token(user, otp):
    if not otp:
        frappe.throw(_("Please enter the verification OTP."))

    fails_key = f"{FAILED_ATTEMPTS_PREFIX}{user}"
    failed_count = cint(frappe.cache().get_value(fails_key))
    if failed_count >= MAX_ALLOWED_FAILS:
        frappe.throw(
            _("Too many failed attempts. For security, your account is locked for {0} minutes.").format(LOCKOUT_MINUTES),
            title=_("Account Temporarily Locked")
        )

    cache_key = f"{OTP_CACHE_KEY_PREFIX}{user}"
    cached_otp = frappe.cache().get_value(cache_key)

    if not cached_otp:
        log_security_event(
            user=user,
            subject="OTP Verification Failed (Expired)",
            content="User attempted verification with an expired or non-existent OTP token.",
            status="Failed"
        )
        frappe.throw(
            _("The OTP has expired or is invalid. Please request a new OTP."),
            title=_("OTP Expired")
        )

    if str(cached_otp).strip() != str(otp).strip():
        new_fails = failed_count + 1
        frappe.cache().set_value(fails_key, new_fails, expires_in_sec=LOCKOUT_MINUTES * 60)
        
        log_security_event(
            user=user,
            subject="Invalid OTP Attempt",
            content=f"Incorrect OTP token entered. Attempt {new_fails} of {MAX_ALLOWED_FAILS}.",
            status="Failed"
        )

        remaining = MAX_ALLOWED_FAILS - new_fails
        if remaining > 0:
            frappe.throw(
                _("The OTP you entered is incorrect. {0} attempt(s) remaining before temporary lockout.").format(remaining),
                title=_("Invalid OTP")
            )
        else:
            frappe.throw(
                _("The OTP you entered is incorrect. Maximum attempts exceeded. Account locked for {0} minutes.").format(LOCKOUT_MINUTES),
                title=_("Account Temporarily Locked")
            )

    # Success: Clear failed attempts
    frappe.cache().delete_value(fails_key)
    return True


@frappe.whitelist(allow_guest=True)
def verify_otp_only(user_identifier, otp):
    """
    Dedicated API to verify OTP before unlocking New Password controls.
    """
    if not user_identifier:
        if frappe.session.user and frappe.session.user not in ("Guest", "Administrator"):
            user_identifier = frappe.session.user
        else:
            frappe.throw(_("User identification is required."))

    user, employee, cell_no, email = get_employee_contact_details(user_identifier)
    verify_otp_token(user, otp)

    return {
        "status": "success",
        "message": _("OTP verified successfully! Please enter your new password.")
    }


@frappe.whitelist()
def get_password_security_status(user=None):
    if not user:
        user = frappe.session.user

    default_response = {
        "enabled": False,
        "otp_enabled": False,
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
    otp_enabled = bool(cint(getattr(settings, "enable_otp_password_reset", 1)))

    if not settings.enable_mandatory_password_reset:
        res = default_response.copy()
        res["otp_enabled"] = otp_enabled
        return res

    reset_day = cint(getattr(settings, "mandatory_reset_day_of_month", 1)) or 1
    cycle_reset_date, next_upcoming_reset_date = calculate_monthly_reset_date(reset_day)
    today = getdate(nowdate())

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
    reminder_days = cint(settings.password_reset_reminder_days) or 7

    if today >= cycle_reset_date:
        if not last_reset_on or last_reset_on < cycle_reset_date:
            reset_required = True
            days_remaining = 0
            effective_next_date = cycle_reset_date
        else:
            days_remaining = (next_upcoming_reset_date - today).days
            effective_next_date = next_upcoming_reset_date
    else:
        days_remaining = (cycle_reset_date - today).days
        effective_next_date = cycle_reset_date
        reminder_start_date = add_days(cycle_reset_date, -reminder_days)
        if reminder_start_date <= today < cycle_reset_date:
            if not last_reset_on or last_reset_on < cycle_reset_date:
                show_reminder = True

    return {
        "enabled": True,
        "otp_enabled": otp_enabled,
        "reset_required": reset_required,
        "show_reminder": show_reminder,
        "days_remaining": max(0, days_remaining),
        "next_password_reset_date": str(effective_next_date),
        "last_password_reset_on": str(last_reset_on) if last_reset_on else None,
        "policy": policy,
    }


def validate_password_policy(new_password, settings=None):
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
        if not re.match(r"^[a-zA-Z0-9]+$", new_password):
            frappe.throw(
                _("Special characters and spaces are not allowed in the password as per security policy."),
                title=_("Password Policy Violation")
            )


@frappe.whitelist(allow_guest=True)
def set_new_password_with_otp(user_identifier, otp, new_password, confirm_password):
    if not user_identifier:
        if frappe.session.user and frappe.session.user not in ("Guest", "Administrator"):
            user_identifier = frappe.session.user
        else:
            frappe.throw(_("User identification is required."))

    user, employee, cell_no, email = get_employee_contact_details(user_identifier)

    settings = frappe.get_cached_doc("Sahayog Settings")
    otp_enabled = bool(cint(getattr(settings, "enable_otp_password_reset", 1)))

    if otp_enabled:
        verify_otp_token(user, otp)

    if not new_password:
        frappe.throw(_("Please enter a new password."))

    if new_password != confirm_password:
        frappe.throw(_("New password and confirm password do not match."))

    # Prevent Password Re-use
    check_is_current_password(user, new_password)

    validate_password_policy(new_password, settings)

    from frappe.utils.password import update_password
    update_password(user=user, pwd=new_password, logout_all_sessions=False)

    frappe.db.set_value("User", user, "last_password_reset_on", frappe.utils.today())
    frappe.db.commit()

    frappe.cache().delete_value(f"{OTP_CACHE_KEY_PREFIX}{user}")

    # Security Audit Log
    log_security_event(
        user=user,
        subject="Password Successfully Reset via OTP",
        content=f"Employee '{employee.employee_name}' successfully reset their account password via 2-Factor OTP verification.",
        status="Success"
    )

    return {
        "status": "success",
        "message": _("Password has been reset successfully! You can now log in with your new password.")
    }


@frappe.whitelist()
def reset_user_password(new_password, confirm_password, otp=None):
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)

    settings = frappe.get_cached_doc("Sahayog Settings")
    otp_enabled = bool(cint(getattr(settings, "enable_otp_password_reset", 1)))

    if otp_enabled:
        if not otp:
            frappe.throw(_("Please enter the verification OTP sent to your registered mobile/email."))
        verify_otp_token(user, otp)

    if not new_password:
        frappe.throw(_("Please enter a new password."))

    if new_password != confirm_password:
        frappe.throw(_("New password and confirm password do not match."))

    # Prevent Password Re-use
    check_is_current_password(user, new_password)

    validate_password_policy(new_password, settings)

    from frappe.utils.password import update_password
    update_password(user=user, pwd=new_password, logout_all_sessions=False)

    frappe.db.set_value("User", user, "last_password_reset_on", frappe.utils.today())
    frappe.db.commit()

    if otp_enabled:
        frappe.cache().delete_value(f"{OTP_CACHE_KEY_PREFIX}{user}")

    # Security Audit Log
    log_security_event(
        user=user,
        subject="Mandatory Monthly Password Reset Completed",
        content=f"User successfully completed their mandatory monthly password change via OTP verification.",
        status="Success"
    )

    return {
        "status": "success",
        "message": _("Password reset successful. You may now continue using Sahayog.")
    }


def boot_session(bootinfo):
    try:
        bootinfo.password_security = get_password_security_status()
    except Exception as e:
        frappe.logger().error(f"Error extending bootinfo for password security: {e}")
        bootinfo.password_security = {
            "enabled": False,
            "reset_required": False,
            "show_reminder": False
        }
