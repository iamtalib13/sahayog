# Copyright (c) 2025
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import frappe
from frappe.core.doctype.communication.email import make
from frappe.utils import formatdate

class DisciplinaryCase(Document):

    def before_insert(self):
        user = frappe.session.user

        # If user is Administrator
        if user == "Administrator":
            self.hr_employee_id = "Administrator"
            self.hr_name = "Administrator"
            return

        hr_employee_data = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "employee_name"]
        )
        if hr_employee_data:
            self.hr_employee_id, self.hr_name = hr_employee_data
        else:
            frappe.throw("Please set User ID in Employee record.")

    def after_insert(self):
        # Set case_id = name after record is created
        self.db_set("case_id", self.name, update_modified=False)
@frappe.whitelist()
def get_case_stages(case_id):
    """
    Return stages with their status + modified timestamp
    """
    all_stages = [
        "Disciplinary Case",
        "Suspension Process",
        "Response to SCN",
        "Unauthorized Absence",
        "Reminder Of Unauthorized Absence",
        "Domestic Enquiry",
        "Enquiry Reminder",
        "Case Closure",
    ]

    timeline = []

    for stage in all_stages:
        docname = frappe.db.exists(stage, {"case_id": case_id})

        if docname:
            doc = frappe.get_doc(stage, docname)
            docstatus = doc.docstatus or 0

            if docstatus == 1:
                timeline.append({
                    "stage": stage,
                    "status": "submitted",   # green
                    "modified": doc.modified
                })
            else:
                timeline.append({
                    "stage": stage,
                    "status": "saved",       # orange
                    "modified": doc.modified
                })
        else:
            timeline.append({
                "stage": stage,
                "status": "current",       # yellow
                "modified": None
            })

    return {"timeline": timeline}

# check if employee has company email
@frappe.whitelist()
def check_employee_email(employee):
    if not employee:
        return None
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None

# save email and send SCN email
@frappe.whitelist()
def save_and_send_email(employee, email, docname):
    """
    Save manually entered employee email, then send SCN email immediately.
    """
    # Save email into Employee Doctype
    emp = frappe.get_doc("Employee", employee)
    emp.company_email = email
    emp.save(ignore_permissions=True)

    # Send SCN email directly
    send_scn_email(docname)

    return "OK"

# send SCN email with attachment
@frappe.whitelist()
def send_scn_email(docname):
    """
    Send SCN email with attachment:
    Print Format → "Disciplinary Case Notice"
    """
    doc = frappe.get_doc("Disciplinary Case", docname)
    
    # Employee email
    emp = frappe.get_doc("Employee", doc.employee_id)
    final_email = emp.company_email

    if not final_email:
        frappe.throw("No email found for this employee.")

    # Prepare doc_dict and apply formatted dates
    doc_dict = doc.as_dict()
    if doc.issue_occurrence_date:
        doc_dict["issue_occurrence_date"] = formatdate(doc.issue_occurrence_date)
    if doc.issue_report_to_hr:
        doc_dict["issue_report_to_hr"] = formatdate(doc.issue_report_to_hr)

    # Load email template
    template = frappe.get_doc("Email Template", "Disciplinary - SCN")
    message = frappe.render_template(template.response_html, doc_dict)
    subject = frappe.render_template(template.subject, doc_dict)

    # Attach Print Format → **Disciplinary Case Notice**
    attachments = [
        frappe.attach_print(
            doctype="Disciplinary Case",
            name=docname,
            print_format="Disciplinary Case Notice",
            file_name=f"{docname}.pdf"
        )
    ]

    # Send email
    frappe.sendmail(
        recipients=[final_email],
        subject=subject,
        message=message,
        attachments=attachments,
        reference_doctype="Disciplinary Case",
        reference_name=docname,
        now=True
    )

    return "Email Sent"

# save employee email only
@frappe.whitelist()
def save_employee_email(employee, email):
    emp = frappe.get_doc("Employee", employee)
    emp.company_email = email
    emp.db_update()
    return "OK"