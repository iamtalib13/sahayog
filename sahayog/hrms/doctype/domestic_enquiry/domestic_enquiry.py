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

# ✅ ONLY ADDITION
    def on_submit(self):
        """
        Auto-send Domestic Enquiry email on submit.
        [DISABLED TEMPORARILY]
        """
        return
        try:
            emp = frappe.get_doc("Employee", self.employee_id)

            # Do not block submit if email missing
            if not emp.company_email:
                frappe.msgprint(
                    "Domestic Enquiry submitted successfully, but email was not sent because employee email is missing.",
                    indicator="orange"
                )
                return

            send_domestic_enquiry_email(self.name)

            frappe.msgprint(
                "Domestic Enquiry submitted successfully and notice email sent to employee.",
                indicator="green"
            )

        except Exception:
            # Never block submit
            frappe.log_error(
                frappe.get_traceback(),
                "Auto Domestic Enquiry Email Failed on Submit"
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

    # Load Email Template (dates formatted via strftime in template)
    template = frappe.get_doc("Email Template", "Domestic Enquiry Notice")

    context = {"doc": doc}

    # Render Email
    message = frappe.render_template(template.response_html, context)
    subject = frappe.render_template(template.subject, context)

  # Attach Print Format → **Domestic Enquiry Notice**
    attachments = [
        frappe.attach_print(
            doctype="Domestic Enquiry",
            name=docname,
            print_format="Domestic Enquiry",
            file_name=f"{docname}"
        )
    ]
    # Send Email
    frappe.sendmail(
        recipients=[final_email],
        sender="dcm@sahayogmultistate.com",
        subject=subject,
        message=message,
        attachments=attachments,
        reference_doctype="Domestic Enquiry",
        reference_name=docname,
        now=False
    )
    return "Email Sent"
