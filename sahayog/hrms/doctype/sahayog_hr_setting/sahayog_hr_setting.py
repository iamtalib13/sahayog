import frappe
from frappe import _
from frappe.model.document import Document
from functools import wraps

class SahayogHRSetting(Document):
    pass


@frappe.whitelist()
def insert_employees():
    from sahayog.api.employee_master_import import import_employee_master
    return import_employee_master(mode="insert")


@frappe.whitelist()
def update_employees():
    from sahayog.api.employee_master_import import import_employee_master
    return import_employee_master(mode="update")


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
