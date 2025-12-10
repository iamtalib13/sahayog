import frappe
from frappe.model.document import Document

class DomesticEnquiry(Document):
    def autoname(self):
        if self.case_id:
            count = frappe.db.count("Domestic Enquiry", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-ENQ-{count:02d}"
        else:
            self.name = frappe.model.naming.make_autoname("ENQ-.#####")

    def validate(self):
        """Restrict creation if linked Response to SCN is Satisfactory"""
        if self.case_id:
            status = frappe.db.get_value(
                "Response to SCN",
                {"case_id": self.case_id},
                "status_of_response"
            )
            if status == "Satisfactory":
                frappe.throw(
                    ("Cannot create Domestic Enquiry when 'Status of Response' is 'Satisfactory'."),
                    title=("Action Restricted")
                )


# Check employee email
@frappe.whitelist()
def check_employee_email(employee):
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None


# Send Domestic Enquiry Notice Email
@frappe.whitelist()
def send_domestic_enquiry_email(docname):

    # Load Domestic Enquiry Document
    doc = frappe.get_doc("Domestic Enquiry", docname)
    emp = frappe.get_doc("Employee", doc.employee_id)

    # Check Email
    final_email = emp.company_email
    if not final_email:
        frappe.throw("No email found for this employee.")

    # Prepare data for template
    doc_dict = doc.as_dict()

    # Format date
    from frappe.utils import formatdate

    if doc.date_of_enquiry:
        doc_dict["date_of_enquiry"] = formatdate(doc.date_of_enquiry)

    # Load Email Template
    template = frappe.get_doc("Email Template", "Domestic Enquiry Notice")

    # Render Email
    message = frappe.render_template(template.response_html, doc_dict)
    subject = frappe.render_template(template.subject, doc_dict)

    # Send Email
    frappe.sendmail(
        recipients=[final_email],
        subject=subject,
        message=message,
        attachments=[],
        reference_doctype="Domestic Enquiry",
        reference_name=docname,
        now=True
    )

    return "Email Sent"
