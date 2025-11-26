import frappe
from frappe.model.document import Document
from functools import wraps


def email_notification_enabled(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Get the single doc value
        setting = frappe.db.get_single_value(
            "Sahayog HR Setting",
            "enable_email_notifications"
        )

        if not setting:
            frappe.logger().info("Email Notification Disabled — Skipping method")
            return None   # Or custom return message

        return func(*args, **kwargs)

    return wrapper


class SahayogHRSetting(Document):
    pass
