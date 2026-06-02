import frappe
from frappe import _


# =========================
# 1. GET DEFAULTS
# =========================
@frappe.whitelist()
def get_dams_email_defaults(doctype, docname):

    mapping = {
        "Disciplinary Case": ("Disciplinary - SCN", "Disciplinary-SCN"),
        "Suspension Process": ("Suspension Process", "Suspension Process"),
        "Response to SCN": ("Response to SCN", "Response to SCN"),
        "Domestic Enquiry": ("Domestic Enquiry Notice", "Domestic Enquiry"),
        "Enquiry Reminder": ("Reminder Notice of Enquiry", "Enquiry Reminder"),
        "Case Closure": ("Case Closure Update", "Case Closure"),
        "Unauthorized Absence": ("Unauthorized Absence", "Unauthorized Absence"),
        "Reminder Of Unauthorized Absence": ("Reminder Of Unauthorized Absence", "Reminder Unauthorized absence"),
        "Ex Parte Enquiry": ("Ex Parte Enquiry", "Ex Parte Enquiry"),
    }

    template_name, print_format = mapping.get(doctype, (None, None))

    if doctype in ["Unauthorized Absence", "Reminder Of Unauthorized Absence", "Ex Parte Enquiry"]:
        fixed_cc = frappe.db.get_single_value("Sahayog HR Setting", "unauthorized_absence_cc")
    else:
        fixed_cc = frappe.db.get_single_value("Sahayog HR Setting", "disciplinary_case_cc")

    return {
        "template": template_name,
        "print_format": print_format,
        "cc": fixed_cc
    }


# =========================
# 2. CORE EMAIL SENDER
# =========================
def _send_email(docname, doctype, recipients, cc, subject, message, print_format):

    if isinstance(recipients, str):
        recipients = [r.strip() for r in recipients.split(",") if r.strip()]

    if isinstance(cc, str):
        cc = [c.strip() for c in cc.split(",") if c.strip()]

    frappe.sendmail(
        recipients=recipients,
        cc=cc,
        subject=subject,
        content=message,
        reference_doctype=doctype,
        reference_name=docname,
        attachments=[{
            "print_format": print_format,
            "doctype": doctype,
            "name": docname,
            "file_name": f"{docname}.pdf"
        }],
        now=True
    )

    return "OK"


# =========================
# 3. API WRAPPER (FRONTEND CALL)
# =========================
@frappe.whitelist()
def send_dams_email(docname, doctype, recipients, cc, subject, message, print_format):
    if not recipients:
        frappe.throw(_("Recipients are mandatory."))

    return _send_email(docname, doctype, recipients, cc, subject, message, print_format)


# =========================
# 4. OPTIONAL GENERIC API
# =========================
@frappe.whitelist()
def send_custom_email(docname, doctype, recipients, cc, subject, message, print_format="Standard"):
    if not recipients:
        frappe.throw(_("Recipients are mandatory."))

    return _send_email(docname, doctype, recipients, cc, subject, message, print_format)