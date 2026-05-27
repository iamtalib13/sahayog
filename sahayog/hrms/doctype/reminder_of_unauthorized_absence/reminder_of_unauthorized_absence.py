# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
from frappe.utils import formatdate

class ReminderOfUnauthorizedAbsence(Document):
    def before_insert(self):
        self._validate_ua_response()

    def validate(self):
        self._validate_ua_response()

    def _latest_ua_response(self):
        if not self.case_id:
            return None

        latest_ua = frappe.get_all(
            "Unauthorized Absence",
            filters={"case_id": self.case_id},
            fields=["response_of_ua"],
            order_by="creation desc",
            limit_page_length=1,
        )

        if not latest_ua:
            return None

        return latest_ua[0].get("response_of_ua")

    def _validate_ua_response(self):
        if self._latest_ua_response() == "Satisfactory":
            frappe.throw(
                "Reminder Of Unauthorized Absence cannot be created because the linked Unauthorized Absence has Status of Response set to Satisfactory."
            )

    def autoname(self):
        """Generate structured name and link with latest Unauthorized Absence"""
        if self.case_id:
            # Find latest Unauthorized Absence for same case
            latest_ua = frappe.db.get_list(
                "Unauthorized Absence",
                filters={"case_id": self.case_id},
                fields=["name"],
                order_by="creation desc",
                limit_page_length=1,
            )

            # If found, link it
            if latest_ua:
                self.unauthorized_absence_id = latest_ua[0].name

            # Count reminders for same case
            count = frappe.db.count("Reminder Of Unauthorized Absence", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-RUA-{count:02d}"

        else:
            # fallback autoname if no case linked
            self.name = frappe.model.naming.make_autoname("RUA-.#####")

    def on_submit(self):
        """
        Auto send Reminder Unauthorized Absence email on submit.
        Existing email logic is reused without modification.
        """
        try:
            from sahayog.utils.hr_utils import send_hr_workflow_email
            send_hr_workflow_email(
                self.name, 
                "Reminder Of Unauthorized Absence",
                print_format="Reminder Unauthorized absence"
            )
        except Exception:
            # Do not block submission if email fails
            frappe.log_error(
                frappe.get_traceback(),
                "Reminder Of Unauthorized Absence Auto Email Failed"
            )

@frappe.whitelist()
def check_employee_email(employee):
    """Return employee email if exists, else None."""
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None

@frappe.whitelist()
def send_reminder_unauthorized_absence_email(docname):
    """Send Reminder Unauthorized Absence Email using centralized utility."""
    from sahayog.utils.hr_utils import send_hr_workflow_email
    return send_hr_workflow_email(
        docname, 
        "Reminder Of Unauthorized Absence",
        print_format="Reminder Unauthorized absence"
    )