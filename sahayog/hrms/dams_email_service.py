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
# 1.1 TEMPLATE PREVIEW (SERVER-SIDE RENDERING)
# =========================
@frappe.whitelist()
def get_email_template_preview(template_name, doctype, docname):
    if not template_name or not doctype or not docname:
        return {"subject": "", "message": ""}

    doc = frappe.get_doc(doctype, docname)
    template = frappe.get_doc("Email Template", template_name)

    # Use a standard context with 'doc' for consistency
    context = {"doc": doc}

    try:
        subject = frappe.render_template(template.subject, context)
        body = frappe.render_template(template.response_html, context)
    except Exception:
        # Fallback to direct string if rendering fails (e.g. malformed jinja)
        subject = template.subject
        body = template.response_html

    return {
        "subject": subject,
        "message": body
    }


@frappe.whitelist()
def standardize_all_email_templates():
    """Update all DAMS email templates in DB to use 'doc.' prefix and fix field names."""
    dams_templates = [
        "Disciplinary - SCN",
        "Suspension Process",
        "Response to SCN",
        "Domestic Enquiry Notice",
        "Reminder Notice of Enquiry",
        "Unauthorized Absence",
        "Reminder Of Unauthorized Absence",
        "Ex Parte Enquiry",
        "Case Closure Update"
    ]

    fields = ["employee_name", "case_id", "case_type", "branch_name", "issue_occurrence_date", 
              "hr_name", "remarks", "employee_id", "status_of_response", "date_of_enquiry", 
              "place_of_enquiry", "enquiry_officer_name", "level", "issue_reported_to_hr", "issue_in_details"]

    for name in dams_templates:
        if frappe.db.exists("Email Template", name):
            et = frappe.get_doc("Email Template", name)
            
            # 1. Fix specific field name bug
            if name == "Reminder Of Unauthorized Absence":
                et.response_html = et.response_html.replace("issue_date_reported_to_hr", "doc.issue_reported_to_hr")

            # 2. Standardize tags: {{ field }} -> {{ doc.field }}
            for field in fields:
                old_tags = [
                    "{{" + f" {field} " + "}}",
                    "{{" + f"{field}" + "}}"
                ]
                new_tag = "{{" + f" doc.{field} " + "}}"
                
                for old in old_tags:
                    if et.subject:
                        et.subject = et.subject.replace(old, new_tag)
                    if et.response_html:
                        et.response_html = et.response_html.replace(old, new_tag)

            et.save(ignore_permissions=True)
    
    frappe.db.commit()
    return "Templates Standardized"


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
