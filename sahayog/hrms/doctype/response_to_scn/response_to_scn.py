from frappe.model.document import Document
import frappe
import frappe
from frappe import _

class ResponsetoSCN(Document):

    def autoname(self):
        if self.case_id:
            count = frappe.db.count("Response to SCN", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-RSCN-{count:02d}"
        else:
            self.name = frappe.model.naming.make_autoname("RSCN-.#####")

# ✅ AUTO EMAIL ON SUBMIT (NON-BLOCKING)
    def on_submit(self):
        """
        Auto-send Response to SCN email on submit.
        [DISABLED TEMPORARILY]
        """
        return
        try:
            emp = frappe.get_doc("Employee", self.employee_id)

            # Email missing → do not block submit
            if not emp.company_email:
                frappe.msgprint(
                    "Response to SCN submitted successfully, but email was not sent because employee email is missing.",
                    indicator="orange"
                )
                return

            # Send email
            send_response_scn_email(self.name)

            frappe.msgprint(
                "Response to SCN submitted successfully and email sent to employee.",
                indicator="green"
            )

        except Exception:
            # Never block submit
            frappe.log_error(
                frappe.get_traceback(),
                "Response to SCN Auto Email Failed on Submit"
            )


@frappe.whitelist()
def check_employee_email(employee):
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None

@frappe.whitelist()
def send_response_scn_email(docname):
    doc = frappe.get_doc("Response to SCN", docname)

    # Load template (dates formatted via strftime in template)
    template = frappe.get_doc("Email Template", "Response to SCN")

    context = {"doc": doc}

    message = frappe.render_template(template.response_html, context)
    subject = frappe.render_template(template.subject, context)

    # Get employee email
    emp = frappe.get_doc("Employee", doc.employee_id)
    final_email = emp.company_email
    if not final_email:
        frappe.throw("No email found for this employee.")

    # Attachments if any
    attachments = []
    if doc.document_upload:
        try:
            file_doc = frappe.get_doc("File", {"file_url": doc.document_upload})
            attachments.append({
                "fname": file_doc.file_name,
                "fcontent": file_doc.get_content()
            })
        except Exception as e:
            frappe.log_error(f"Failed to attach file: {str(e)}", "Response to SCN Email")

    # Send email
    frappe.sendmail(
        recipients=[final_email],
        sender="dcm@sahayogmultistate.com",
        subject=subject,
        message=message,
        attachments=attachments,
        reference_doctype="Response to SCN",
        reference_name=docname,
        now=True
    )

    return "Email Sent"
