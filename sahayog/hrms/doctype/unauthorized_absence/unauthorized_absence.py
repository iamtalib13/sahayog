# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
import frappe
from frappe.utils import formatdate

class UnauthorizedAbsence(Document):
  def autoname(self):
    from frappe.utils import getdate

    today = getdate()
    fy = today.year

    self.name = frappe.model.naming.make_autoname(f"UA-FY-{fy}-.####")
    def on_submit(self):
        """
        Auto send Unauthorized Absence email on submit.
        Existing send logic is reused – no duplication.
        """
        try:
            send_unauthorized_absence_email(self.name)
        except Exception:
            # Log error but do not block submission
            frappe.log_error(
                frappe.get_traceback(),
                "Unauthorized Absence Auto Email Failed"
            )

@frappe.whitelist()
def check_employee_email(employee):
    """Return employee's email if exists, otherwise None."""
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None

@frappe.whitelist()
def send_unauthorized_absence_email(docname):
    """Send Unauthorized Absence Email using Email Template."""
    
    doc = frappe.get_doc("Unauthorized Absence", docname)

    # Convert doc to dictionary for Jinja
    doc_dict = doc.as_dict()

    # Format dates (optional)
    date_fields = ["issue_occurrence_date", "issue_reported_to_hr", "date_of_1st_letter"]
    for df in date_fields:
        if doc_dict.get(df):
            doc_dict[df] = formatdate(doc_dict[df])

    # Load Email Template
    template = frappe.get_doc("Email Template", "Unauthorized Absence")

    # Render Subject & Body
    subject = frappe.render_template(template.subject, doc_dict)
    message = frappe.render_template(template.response_html, {"doc": doc_dict})

    # Get Employee Email
    emp = frappe.get_doc("Employee", doc.employee_id)
    final_email = emp.company_email
    if not final_email:
        frappe.throw("No email found for this employee.")

  # Attach Print Format → **Unauthorized Absence Notice**
    attachments = [
        frappe.attach_print(
            doctype="Unauthorized Absence",
            name=docname,
            print_format="Unauthorized Absence",
            file_name=f"{docname}"
        )
    ]

    # Send Email
    frappe.sendmail(
        recipients=[final_email],
        subject=subject,
        message=message,
        attachments=attachments,
        reference_doctype="Unauthorized Absence",
        reference_name=docname,
        now=False
    )
    return "Email Sent Successfully"
