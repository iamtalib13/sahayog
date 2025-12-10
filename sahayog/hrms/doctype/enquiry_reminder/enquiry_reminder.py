import frappe
from frappe.model.document import Document

class EnquiryReminder(Document):
    def autoname(self):
        if self.case_id:
            # Count how many Enquiry Reminder records already exist for this case
            count = frappe.db.count("Enquiry Reminder", {"case_id": self.case_id}) + 1
            # Name pattern: <CaseID>-ENQREM-<count in 2 digits>
            self.name = f"{self.case_id}-ENQREM-{count:02d}"
        else:
            # Fallback autoname if case_id not provided
            self.name = frappe.model.naming.make_autoname("ENQREM-.#####")

        """Auto-fetch fields from latest Domestic Enquiry for the same case_id"""     
    def before_insert(self):
      
        if self.case_id:
            de_list = frappe.get_all(
                "Domestic Enquiry",
                filters={"case_id": self.case_id},
                order_by="creation desc",
                fields=["name", "domestic_enquiry", "status_of_response", "date_of_enquiry",
                        "place_of_enquiry", "enquiry_officer_name", ]
            )
            if de_list:
                de = de_list[0]  # latest Domestic Enquiry
                # ✅ Fetch "Yes" / "No" from Domestic Enquiry field
                self.domestic_enquiry = de.domestic_enquiry
                self.status_of_response = de.status_of_response
                self.date_of_enquiry = de.date_of_enquiry
                self.place_of_enquiry = de.place_of_enquiry
                self.enquiry_officer_name = de.enquiry_officer_name

# get latest enquiry documents for a case   
@frappe.whitelist()
def check_employee_email(employee):
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None

# send reminder mail notification for enquiry
@frappe.whitelist()
def send_reminder_enquiry_email(docname):

    doc = frappe.get_doc("Enquiry Reminder", docname)
    emp = frappe.get_doc("Employee", doc.employee_id)

    final_email = emp.company_email
    if not final_email:
        frappe.throw("No email found for this employee.")

    # Prepare dictionary for template rendering
    doc_dict = doc.as_dict()

    # Format dates used in the template
    from frappe.utils import formatdate

    if doc.date_of_2nd_enquiry:
        doc_dict["date_of_2nd_enquiry"] = formatdate(doc.date_of_2nd_enquiry)

    if doc.issue_occurrence_date:
        doc_dict["issue_occurrence_date"] = formatdate(doc.issue_occurrence_date)

    # Load Email Template
    template = frappe.get_doc("Email Template", "Reminder Notice of Enquiry")

    message = frappe.render_template(template.response_html, doc_dict)
    subject = frappe.render_template(template.subject, doc_dict)

    # Send email
    frappe.sendmail(
        recipients=[final_email],
        subject=subject,
        message=message,
        attachments=[],  
        reference_doctype="Enquiry Reminder",
        reference_name=docname,
        now=True
    )

    return "Email Sent"
