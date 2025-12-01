import frappe
from frappe.model.document import Document
from functools import wraps

class SahayogHRSetting(Document):
    pass


# -----------------------------
# Email Notification Decorator
# -----------------------------
def email_notification_enabled(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        setting = frappe.db.get_single_value(
            "Sahayog HR Setting",
            "enable_email_notifications"
        )

        if not setting:
            return {
                "status": "disabled",
                "msg": "Email notifications are disabled in settings."
            }

        return func(*args, **kwargs)

    return wrapper
