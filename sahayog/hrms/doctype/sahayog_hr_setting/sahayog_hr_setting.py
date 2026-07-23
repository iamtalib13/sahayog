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


@frappe.whitelist()
def init_import(mode="insert", batch_size=500):
    from sahayog.api.employee_master_import import init_import_session
    return init_import_session(mode=mode, batch_size=batch_size)


@frappe.whitelist()
def process_batch(mode="insert", batch_index=0, batch_size=500):
    from sahayog.api.employee_master_import import process_import_batch
    return process_import_batch(mode=mode, batch_index=batch_index, batch_size=batch_size)


@frappe.whitelist()
def finish_import(mode="insert", summary_data=None):
    from sahayog.api.employee_master_import import finish_import_session
    return finish_import_session(summary_data=summary_data, mode=mode)


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
