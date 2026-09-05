import frappe
from frappe import _


# =========================
# 1. GET DEFAULTS
# =========================
@frappe.whitelist()
def get_dams_email_defaults(doctype, docname):
    # Mapping for templates
    template_mapping = {
        "Disciplinary Case": "Disciplinary - SCN",
        "Suspension Process": "Suspension Process",
        "Response to SCN": "Response to SCN",
        "Domestic Enquiry": "Domestic Enquiry Notice",
        "Enquiry Reminder": "Reminder Notice of Enquiry",
        "Case Closure": "Case Closure Update",
        "Unauthorized Absence": "Unauthorized Absence",
        "Reminder Of Unauthorized Absence": "Reminder Of Unauthorized Absence",
        "Ex Parte Enquiry": "Ex Parte Enquiry"
    }

    absence_doctypes = [
        "Unauthorized Absence",
        "Reminder Of Unauthorized Absence",
        "Ex Parte Enquiry"
    ]

    fixed_cc = frappe.db.get_single_value(
        "Sahayog HR Setting",
        "unauthorized_absence_cc" if doctype in absence_doctypes else "disciplinary_case_cc"
    )

    doc = frappe.get_doc(doctype, docname)
    case_id = doc.get("case_id")
    if not case_id and doctype in ["Disciplinary Case", "Unauthorized Absence"]:
        case_id = docname
        
    historical_ccs = []
    seen = set()
    
    if fixed_cc:
        for email in fixed_cc.replace("\n", ",").split(","):
            email = email.strip()
            if email and email not in seen:
                historical_ccs.append(email)
                seen.add(email)

    if case_id:
        related_doctypes = [
            "Disciplinary Case", "Suspension Process", "Response to SCN", 
            "Domestic Enquiry", "Enquiry Reminder", "Case Closure", 
            "Unauthorized Absence", "Reminder Of Unauthorized Absence", "Ex Parte Enquiry"
        ]
        case_docnames = [case_id]
        for dt in related_doctypes:
            try:
                names = frappe.get_all(dt, filters={"case_id": case_id}, pluck="name")
                case_docnames.extend(names)
            except Exception:
                pass
                
        if case_docnames:
            email_queues = frappe.get_all(
                "Email Queue",
                filters={"reference_name": ["in", case_docnames]},
                fields=["show_as_cc"],
                order_by="creation asc"
            )
            for eq in email_queues:
                if eq.show_as_cc:
                    for email in eq.show_as_cc.replace("\n", ",").split(","):
                        email = email.strip()
                        if email and email not in seen:
                            historical_ccs.append(email)
                            seen.add(email)

    combined_cc = ",".join(historical_ccs)

    response = {
        "template": template_mapping.get(doctype),
        "cc": combined_cc
    }

    if doctype == "Case Closure":
        # Map case_close_with to Print Format
        format_mapping = {
            "Termination": "Office Order Termination of Services",
            "Termination-Abandonment": "Termination due to abandonment",
            "Accepting Resignation": None,
            "Warning Letter": "Warning Letter",
            "Caution Letter": "Caution Letter",
            "Drop Charges": None
        }
        
        doc = frappe.get_doc("Case Closure", docname)
        response["print_format"] = format_mapping.get(doc.case_close_with)
    else:
        # Mapping for single print format doctypes
        format_mapping = {
            "Disciplinary Case": "Disciplinary Case Notice",
            "Suspension Process": "Suspension Order",
            "Response to SCN": None,  # No print format exists for this
            "Domestic Enquiry": "Domestic Enquiry",
            "Enquiry Reminder": "Reminder Notice Of Enquiry",
            "Unauthorized Absence": "Unauthorized Absence",
            "Reminder Of Unauthorized Absence": "Reminder Unauthorized absence",
            "Ex Parte Enquiry": "Ex Parte Enquiry",
        }
        response["print_format"] = format_mapping.get(doctype)

    return response

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


# ... (rest of the file content until _send_email)
# ...

# =========================
# 2. CORE EMAIL SENDER
# =========================
from frappe import attach_print

def _send_email(docname, doctype, recipients, cc, subject, message, print_format):

    if isinstance(recipients, str):
        recipients = [r.strip() for r in recipients.split(",") if r.strip()]

    if isinstance(cc, str):
        cc = [c.strip() for c in cc.split(",") if c.strip()]

    attachments = []
    
    if print_format:
        try:
            # Generate the attachment object using attach_print
            attachment = attach_print(
                doctype,
                docname,
                print_format=print_format,
                file_name=f"{docname}.pdf"
            )
            attachments.append(attachment)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"Print Format Attachment Failed - {doctype}")
            frappe.throw(_("Unable to generate attachment for print format {0}").format(print_format))

    frappe.sendmail(
        recipients=recipients,
        sender="dcm@sahayogmultistate.com",
        cc=cc,
        subject=subject,
        content=message,
        reference_doctype=doctype,
        reference_name=docname,
        attachments=attachments,
        expose_recipients="header",
        now=True
    )

    # Auto-fill Show Cause Date on first mail for Disciplinary Case
    try:
        if doctype == "Disciplinary Case" and print_format in ["Disciplinary Case Notice", "Disciplinary-SCN", "Show Cause Notice"]:
            doc = frappe.get_doc(doctype, docname)
            if not doc.get("show_cause_date"):
                frappe.db.set_value(doctype, docname, "show_cause_date", frappe.utils.nowdate())
                frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Auto-fill Show Cause Date failed")

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
