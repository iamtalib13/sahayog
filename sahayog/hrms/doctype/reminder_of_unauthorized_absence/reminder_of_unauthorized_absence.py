# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
from frappe.utils import formatdate

class ReminderOfUnauthorizedAbsence(Document):
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
            send_reminder_unauthorized_absence_email(self.name)
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
    """Send Reminder Unauthorized Absence Email using Email Template."""

    doc = frappe.get_doc("Reminder Of Unauthorized Absence", docname)
    doc_dict = doc.as_dict()

    # Format dates if required
    date_fields = [
        "issue_occurrence_date",
        "issue_date_reported_to_hr",
        "date_of_unauthorized_absence_letter",
        "date_of_reminder_unauthorized_absence_letter"
    ]
    for df in date_fields:
        if doc_dict.get(df):
            doc_dict[df] = formatdate(doc_dict[df])

    # Load Email Template
    template = frappe.get_doc("Email Template", "Reminder Of Unauthorized Absence")

    # Render Subject and Body
    subject = frappe.render_template(template.subject, doc_dict)
    message = frappe.render_template(template.response_html, {"doc": doc_dict})

    # Get employee email
    emp = frappe.get_doc("Employee", doc.employee_id)
    final_email = emp.company_email
    if not final_email:
        frappe.throw("No email found for this employee.")

    # Fetch CC Recipients
    cc_list = []
    hr_settings = frappe.get_single("Sahayog HR Setting")

    # 1. Fixed CC IDs from settings
    if hr_settings.unauthorized_absence_cc:
        # Replace newlines, tabs, and quotes with commas, then split and strip
        raw_cc = hr_settings.unauthorized_absence_cc.replace("\n", ",").replace("\r", ",").replace("\t", ",").replace('"', '')
        fixed_emails = [e.strip() for e in raw_cc.split(",") if e.strip()]
        cc_list.extend(fixed_emails)

    # 2. Reporting Manager's Email
    if emp.reports_to:
        manager_email = frappe.db.get_value("Employee", emp.reports_to, "company_email")
        if manager_email:
            cc_list.append(manager_email)

    # Clean and deduplicate CC list
    cc_list = list(set([e for e in cc_list if e]))

    # Attach Print Format → **Reminder Of Unauthorized Absence Notice**
    attachments = [
        frappe.attach_print(
            doctype="Reminder Of Unauthorized Absence",
            name=docname,
            print_format="Reminder Unauthorized absence",
            file_name=f"{docname}"
        )
    ]

    # Send mail
    frappe.sendmail(
        recipients=[final_email],
        cc=cc_list,
        subject=subject,
        message=message,
        attachments=attachments,
        reference_doctype="Reminder Of Unauthorized Absence",
        reference_name=docname,
        now=False
    )
    return "Email Sent Successfully"