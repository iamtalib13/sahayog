# Copyright (c) 2025
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import frappe
from frappe.core.doctype.communication.email import make
from frappe.utils import formatdate

class DisciplinaryCase(Document):

    
    def on_submit(self):
        """
        Auto-send SCN email on submit.
        [DISABLED TEMPORARILY]
        """
        return
        try:
            # Fetch employee
            emp = frappe.get_doc("Employee", self.employee_id)

            # If employee email missing → do not block submit
            if not emp.company_email:
                frappe.msgprint(
                    "Case submitted successfully, but email was not sent because employee email is missing.",
                    indicator="orange"
                )
                return

            # Send SCN email
            send_scn_email(docname=self.name)

            frappe.msgprint(
                "Case submitted successfully and SCN email sent to employee.",
                indicator="green"
            )

        except Exception:
            # Never block submit
            frappe.log_error(
                frappe.get_traceback(),
                "Auto SCN Email Failed on Submit"
            )

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

    def validate(self):
        if self.employee_id:
            cxo = frappe.db.get_value("Employee", self.employee_id, "cxo_level")
            if cxo:
                frappe.throw("CXO / Higher Management employees cannot be added in Disciplinary Case")

        self.update_employee_emails_in_master()

    def update_employee_emails_in_master(self):
        if not self.employee_id:
            return

        emp = frappe.get_doc("Employee", self.employee_id)
        updated = False

        if self.employee_email and not emp.company_email:
            emp.company_email = self.employee_email
            updated = True

        if self.personal_email and not emp.personal_email:
            emp.personal_email = self.personal_email
            updated = True

        if updated:
            emp.save(ignore_permissions=True)
            frappe.msgprint("Employee email addresses updated in Employee master.")

@frappe.whitelist()
def get_case_stages(case_id):
    if case_id and case_id.startswith("UA"):
        all_stages = [
            "Unauthorized Absence",
            "Reminder Of Unauthorized Absence",
            "Ex Parte Enquiry",
            "Case Closure",
        ]
    else:
        all_stages = [
            "Disciplinary Case",
            "Suspension Process",
            "Response to SCN",
            "Domestic Enquiry",
            "Enquiry Reminder",
            "Ex Parte Enquiry",
            "Case Closure",
        ]

    timeline = []

    for stage in all_stages:
        # 1️⃣ fetch non-cancelled docs first
        docs = frappe.get_all(
            stage,
            filters={"case_id": case_id, "docstatus": ["!=", 2]},
            fields=["name", "docstatus", "modified"],
            order_by="modified desc"
        )

        if docs:
            # pick the latest active doc
            docinfo = docs[0]
            docstatus = docinfo.docstatus or 0

            if docstatus == 1:
                status = "submitted"  # 🟢
            else:
                status = "saved"      # 🟠
            
            # Fetch additional metadata for branching logic
            extra_meta = {}
            # Ensure we fetch values even if they are empty
            fields_to_fetch = ["status_of_response", "response_of_ua", "suspension_required", "response_of_reminder", "enquiry_status"]
            
            # Get the actual document values
            doc = frappe.get_doc(stage, docinfo.name)
            for field in fields_to_fetch:
                if hasattr(doc, field):
                    extra_meta[field] = doc.get(field)

            timeline.append({
                "stage": stage,
                "doctype": stage,
                "status": status,
                "modified": docinfo.modified,
                "meta": extra_meta
            })
        else:
            # fallback: only cancelled exists
            cancelled_doc = frappe.get_all(
                stage,
                filters={"case_id": case_id, "docstatus": 2},
                fields=["name", "modified"],
                order_by="modified desc",
                limit=1
            )
            if cancelled_doc:
                timeline.append({
                    "stage": stage,
                    "doctype": stage,
                    "status": "cancelled",  # grey
                    "modified": cancelled_doc[0].modified
                })
            else:
                # no doc at all
                timeline.append({
                    "stage": stage,
                    "doctype": stage,
                    "status": "current",    # ⚪
                    "modified": None
                })

    return {"timeline": timeline}


@frappe.whitelist()
def get_case_stage_counts(case_id):
    """
    Return count + record names for each DAMS doctype linked to a case_id.
    Used for timeline hover tooltip.
    """

    if not case_id:
        return {}

    if case_id and case_id.startswith("UA"):
        dams_doctypes = [
            "Unauthorized Absence",
            "Reminder Of Unauthorized Absence",
            "Ex Parte Enquiry",
            "Case Closure",
        ]
    else:
        dams_doctypes = [
            "Disciplinary Case",
            "Suspension Process",
            "Response to SCN",
            "Domestic Enquiry",
            "Enquiry Reminder",
            "Ex Parte Enquiry",
            "Case Closure",
        ]

    result = {}

    for dt in dams_doctypes:
        records = frappe.get_all(
            dt,
            filters={"case_id": case_id},
            fields=["name"],
            order_by="creation asc"
        )

        result[dt] = {
            "count": len(records),
            "names": [r.name for r in records]
        }

    return result


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
# send SCN email function ko optimize kiya gaya hai
# @frappe.whitelist()
# def send_scn_email(docname):
#     doc = frappe.get_doc("Disciplinary Case", docname)
#     recipient = frappe.db.get_value("Employee", doc.employee_id, "company_email")

#     if not recipient:
#         frappe.throw("Employee email missing.")

#     # Render Template
#     template = frappe.get_doc("Email Template", "Disciplinary - SCN")
#     doc_dict = doc.as_dict()
#     # Date formatting logic here...

#     # Production Fix: Attachments as a list of dict for Queue compatibility
#     frappe.sendmail(
#         recipients=[recipient],
#         subject=frappe.render_template(template.subject, doc_dict),
#         message=frappe.render_template(template.response_html, doc_dict),
#         reference_doctype="Disciplinary Case",
#         reference_name=docname,
#         attachments=[{
#             "print_format": "Disciplinary Case Notice",
#             "doctype": "Disciplinary Case",
#             "name": docname,
#             "file_name": f"{docname}.pdf"
#         }],
#         now=False 
#     )
#     return "Queued"

@frappe.whitelist()
def send_custom_email(docname, recipients, cc, subject, message):
    if not recipients:
        frappe.throw("Recipients are mandatory.")

    # Convert recipients and cc strings/lists to lists if they are strings
    if isinstance(recipients, str):
        recipients = [r.strip() for r in recipients.split(",") if r.strip()]
    if isinstance(cc, str):
        cc = [c.strip() for c in cc.split(",") if c.strip()]

    frappe.sendmail(
        recipients=recipients,
        sender="dcm@sahayogmultistate.com",
        cc=cc,
        subject=subject,
        content=message,
        reference_doctype="Disciplinary Case",
        reference_name=docname,
        attachments=[{
            "print_format": "Disciplinary Case Notice",
            "doctype": "Disciplinary Case",
            "name": docname,
            "file_name": f"{docname}.pdf"
        }],
        now=True
    )
    return "OK"

@frappe.whitelist()
def send_scn_email(docname):
        """Send welcome notification for first time membership"""
        try:
            notification = frappe.get_doc("Notification", "Show Cause Notice")
            doc = frappe.get_doc("Disciplinary Case", docname)
            notification.send(doc=doc)
            frappe.logger().info(f"Show Cause Notice notification sent to employee: {doc.employee_id}")
        except frappe.DoesNotExistError:
            frappe.log_error("Notification 'Show Cause Notice' not found")
        except Exception as e:
            frappe.log_error(f"Failed to send show cause notice notification: {str(e)}")


# save employee email only
@frappe.whitelist()
def save_employee_email(employee, email):
    emp = frappe.get_doc("Employee", employee)
    emp.company_email = email
    emp.db_update()
    return "OK"
