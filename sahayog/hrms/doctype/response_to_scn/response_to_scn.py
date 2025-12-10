from frappe.model.document import Document
import frappe
import frappe
from frappe.utils import formatdate
from frappe import _

class ResponsetoSCN(Document):

    def autoname(self):
        if self.case_id:
            count = frappe.db.count("Response to SCN", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-RSCN-{count:02d}"
        else:
            self.name = frappe.model.naming.make_autoname("RSCN-.#####")

@frappe.whitelist()
def check_employee_email(employee):
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None

@frappe.whitelist()
def send_response_scn_email(docname):
    doc = frappe.get_doc("Response to SCN", docname)

    # Convert to dictionary for Jinja template
    doc_dict = doc.as_dict()

    # Optional: format dates
    if doc_dict.get("issue_occurrence_date"):
        doc_dict["issue_occurrence_date"] = formatdate(doc_dict["issue_occurrence_date"])

    # Load template
    template = frappe.get_doc("Email Template", "Response to SCN")
    
    # Render using dict
    message = frappe.render_template(template.response_html, {"doc": doc_dict})
    subject = frappe.render_template(template.subject, doc_dict)

    # Get employee email
    emp = frappe.get_doc("Employee", doc.employee_id)
    final_email = emp.company_email
    if not final_email:
        frappe.throw("No email found for this employee.")

    # Attachments if any
    attachments = []
    if doc_dict.get("document_upload"):
        try:
            file_doc = frappe.get_doc("File", {"file_url": doc_dict["document_upload"]})
            attachments.append({
                "fname": file_doc.file_name,
                "fcontent": file_doc.get_content()
            })
        except Exception as e:
            frappe.log_error(f"Failed to attach file: {str(e)}", "Response to SCN Email")

    # Send email
    frappe.sendmail(
        recipients=[final_email],
        subject=subject,
        message=message,
        attachments=attachments,
        reference_doctype="Response to SCN",
        reference_name=docname,
        now=True
    )

    return "Email Sent"
