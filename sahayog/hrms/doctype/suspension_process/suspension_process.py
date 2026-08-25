import frappe
from frappe.model.document import Document
from frappe import _
class SuspensionProcess(Document):
    def autoname(self):
        """Generate structured name based on linked Disciplinary Case"""
        if self.case_id:
            count = frappe.db.count("Suspension Process", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-SUSP-{count:02d}"
        else:
            # fallback if case_id not linked
            self.name = frappe.model.naming.make_autoname("SUSP-.#####")

    def before_insert(self):
        """Restrict record creation if Suspension Required = No in parent case"""
        if self.case_id:
            case = frappe.get_doc("Disciplinary Case", self.case_id)
            if case.suspension_required == "No":
                frappe.throw(
                    _("You cannot create a Suspension Process because 'Suspension Required' is set to No in the linked Disciplinary Case."),
                    title=_("Action Restricted")
                )

    def validate(self):
        """Extra safety — block save if parent says No"""
        if self.case_id:
            case = frappe.get_doc("Disciplinary Case", self.case_id)
            if case.suspension_required == "No":
                frappe.throw(
                    _("Suspension Required is set to No in the linked Disciplinary Case. You cannot create or save this record."),
                    title=_("Validation Failed")
                )

# ✅ ONLY ADDITION — existing logic untouched
    def on_submit(self):
        """
        Auto-send Suspension email on submit.
        [DISABLED TEMPORARILY]
        """
        return
        try:
            emp = frappe.get_doc("Employee", self.employee_id)

            # Do not block submit if email missing
            if not emp.company_email:
                frappe.msgprint(
                    "Suspension Process submitted successfully, but email was not sent because employee email is missing.",
                    indicator="orange"
                )
                return

            send_suspension_email(self.name)

            frappe.msgprint(
                "Suspension Process submitted successfully and email sent to employee.",
                indicator="green"
            )

        except Exception:
            # Never block submit
            frappe.log_error(
                frappe.get_traceback(),
                "Auto Suspension Email Failed on Submit"
            )
            
@frappe.whitelist()
def check_employee_email(employee):
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None

@frappe.whitelist()
def save_and_send_email(employee, email, docname):
    emp = frappe.get_doc("Employee", employee)
    emp.company_email = email
    emp.save(ignore_permissions=True)
    send_suspension_email(docname)
    return "OK"

@frappe.whitelist()
def send_suspension_email(docname):
    """
    Send Suspension email directly to employee,
    with properly formatted dates.
    """
    doc = frappe.get_doc("Suspension Process", docname)
    emp = frappe.get_doc("Employee", doc.employee_id)

    final_email = emp.company_email
    if not final_email:
        frappe.throw("No email found for this employee.")

    # Load suspension email template (dates formatted via strftime in template)
    template = frappe.get_doc("Email Template", "Suspension Process")

    context = {"doc": doc}

    message = frappe.render_template(template.response_html, context)
    subject = frappe.render_template(template.subject, context)

    # Attach Print Format → **Suspension Process Notice**
    attachments = [
        frappe.attach_print(
            doctype="Suspension Process",
            name=docname,
            print_format="Suspension Order",
            file_name=f"{docname}"
        )
    ]
    # Send email instantly
    frappe.sendmail(
        recipients=[final_email],
        sender="dcm@sahayogmultistate.com",
        subject=subject,
        message=message,
        attachments=attachments,
        reference_doctype="Suspension Process",
        reference_name=docname,
        now=False
    )
    return "Email Sent"
