from frappe.core.doctype.user.user import User
import frappe
from frappe.desk.notifications import clear_notifications

class CustomUser(User):
    def on_update(self):
        self.share_with_self()
        clear_notifications(user=self.name)
        frappe.clear_cache(user=self.name)
        now = frappe.flags.in_test or frappe.flags.in_install
        self.send_password_notification(self._User__new_password)
        frappe.logger().info(f"Skipping contact creation for user {self.name}")
        if self.name not in frappe.STANDARD_USERS and not self.user_image:
            frappe.enqueue(
                "frappe.core.doctype.user.user.update_gravatar",
                name=self.name,
                now=now,
                enqueue_after_commit=True,
            )
        if self.time_zone:
            frappe.defaults.set_default("time_zone", self.time_zone, self.name)
        if self.has_value_changed("enabled"):
            frappe.cache.delete_key("users_for_mentions")
            frappe.cache.delete_key("enabled_users")
        elif self.has_value_changed("allow_in_mentions") or self.has_value_changed("user_type"):
            frappe.cache.delete_key("users_for_mentions")