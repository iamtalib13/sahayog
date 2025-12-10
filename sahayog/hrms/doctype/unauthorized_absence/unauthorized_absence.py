# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
import frappe
from frappe.utils import formatdate

class UnauthorizedAbsence(Document):
    def autoname(self):
        """Generate structured name based on linked Disciplinary Case"""
        if self.case_id:
            count = frappe.db.count("Unauthorized Absence", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-UA-{count:02d}"
        else:
            # fallback naming if no case linked
            self.name = frappe.model.naming.make_autoname("UA-.#####")


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

    # Prepare attachments
    attachments = []
    if doc_dict.get("document_upload"):
        try:
            file_doc = frappe.get_doc("File", {"file_url": doc_dict["document_upload"]})
            attachments.append({
                "fname": file_doc.file_name,
                "fcontent": file_doc.get_content()
            })
        except Exception as e:
            frappe.log_error(f"Attachment Error: {str(e)}", "Unauthorized Absence Email")

    # Send Email
    frappe.sendmail(
        recipients=[final_email],
        subject=subject,
        message=message,
        attachments=attachments,
        reference_doctype="Unauthorized Absence",
        reference_name=docname,
        now=True
    )

    return "Email Sent Successfully"
