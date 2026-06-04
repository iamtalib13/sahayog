import frappe
from frappe import scrub
from frappe.utils import formatdate

def get_hr_cc_recipients(doctype, employee_id, docname=None):
    """
    Fetch CC recipients based on HR flow (UA or Disciplinary).
    Includes:
    - Fixed IDs from Sahayog HR Setting
    - Reporting Manager of the employee
    - Concern HR who created the case
    """
    cc_list = []
    hr_settings = frappe.get_single("Sahayog HR Setting")
    
    # Define flows (Original categories)
    ua_flow = ["Unauthorized Absence", "Reminder Of Unauthorized Absence"]
    disc_flow = [
        "Disciplinary Case", 
        "Suspension Process", 
        "Response to SCN", 
        "Domestic Enquiry", 
        "Enquiry Reminder",
        "Case Closure"
    ]

    setting_field = None
    if doctype in ua_flow:
        setting_field = "unauthorized_absence_cc"
    elif doctype in disc_flow:
        setting_field = "disciplinary_case_cc"

    # 1. Fetch fixed CC IDs from settings
    if setting_field and hr_settings.get(setting_field):
        raw_cc = hr_settings.get(setting_field).replace("\n", ",").replace("\r", ",").replace("\t", ",").replace('"', '')
        cc_list.extend([e.strip() for e in raw_cc.split(",") if e.strip()])
    
    # 2. Fetch Reporting Manager's email
    if employee_id:
        manager = frappe.db.get_value("Employee", employee_id, "reports_to")
        if manager:
            manager_email = frappe.db.get_value("Employee", manager, "company_email")
            if manager_email:
                cc_list.append(manager_email)

    # 3. Fetch Concern HR's email (Who created the case)
    if docname:
        hr_employee_id = frappe.db.get_value(doctype, docname, "hr_employee_id")
        if hr_employee_id:
            hr_email = frappe.db.get_value("Employee", hr_employee_id, "company_email")
            if hr_email:
                cc_list.append(hr_email)
            
    return list(set([e for e in cc_list if e]))


def send_hr_workflow_email(docname, doctype, template_name=None, print_format=None):
    """
    Centralized dynamic function to send HR workflow emails.
    - template_name: Defaults to Doctype name.
    - print_format: Defaults to Doctype name.
    """
    from frappe.utils import formatdate

    doc = frappe.get_doc(doctype, docname)
    emp_id = doc.get("employee_id")
    if not emp_id:
        return

    # 1. Recipient Details
    emp = frappe.get_doc("Employee", emp_id)
    recipient = emp.company_email
    if not recipient:
        return

    # 2. CC List (Manager, HR, Fixed IDs)
    cc_list = get_hr_cc_recipients(doctype, emp_id, docname)

    # 3. Prepare Data (Format dates for rendering)
    doc_dict = doc.as_dict()
    for field, value in doc_dict.items():
        if isinstance(value, (frappe.utils.datetime.date, frappe.utils.datetime.datetime)):
            doc_dict[field] = formatdate(value)

    # 4. Load Template & Render
    template_name = template_name or doctype
    try:
        template = frappe.get_doc("Email Template", template_name)
        
        # Use standard 'doc' context for consistency across all templates
        context = {"doc": doc}
        
        subject = frappe.render_template(template.subject, context)
        message = frappe.render_template(template.response_html, context)
    except Exception:
        frappe.log_error(frappe.get_traceback(), f"HR Email Template Error: {template_name}")
        return

    # 5. Attachments
    attachments = []
    
    # Use provided print_format or fallback to doctype
    final_print_format = print_format or doctype
    
    try:
        attachments.append(
            frappe.attach_print(
                doctype=doctype,
                name=docname,
                print_format=final_print_format,
                file_name=f"{docname}"
            )
        )
    except Exception:
        # Fallback if specific print format fails, try default
        try:
            attachments.append(
                frappe.attach_print(
                    doctype=doctype,
                    name=docname,
                    file_name=f"{docname}"
                )
            )
        except Exception:
            pass

    # Special Case: Attach uploaded document if exists (e.g., Response to SCN)
    if doc.get("document_upload"):
        try:
            file_doc = frappe.get_doc("File", {"file_url": doc.document_upload})
            attachments.append({
                "fname": file_doc.file_name,
                "fcontent": file_doc.get_content()
            })
        except Exception:
            pass

    # 6. Send Email
    frappe.sendmail(
        recipients=[recipient],
        sender="dcm@sahayogmultistate.com",
        cc=cc_list,
        subject=subject,
        message=message,
        attachments=attachments,
        reference_doctype=doctype,
        reference_name=docname,
        now=False
    )
    return "Success"


def notify_cc_on_incoming_reply(doc, method):
    """
    Hook on Communication: 
    When an employee replies (Incoming Email) to an HR Case, 
    notify the CC members (Manager + Fixed IDs).
    """
    # Only for actual received emails linked to HR DocTypes
    if doc.communication_type == 'Communication' and doc.sent_or_received == 'Received' \
       and doc.reference_doctype in [
           "Unauthorized Absence", 
           "Reminder Of Unauthorized Absence", 
           "Disciplinary Case"
       ]:
        
        # Get the original case document to find the employee
        try:
            case_doc = frappe.get_doc(doc.reference_doctype, doc.reference_name)
            employee_id = getattr(case_doc, 'employee_id', None)
            
            if not employee_id:
                return

            # Fetch CC recipients using centralized utility
            cc_list = get_hr_cc_recipients(doc.reference_doctype, employee_id, doc.reference_name)
            
            if cc_list:
                # Forward/Notify CC members about the reply
                frappe.sendmail(
                    recipients=cc_list,
                    sender="dcm@sahayogmultistate.com",
                    subject=f"Reply Received: {doc.subject}",
                    message=f"A new reply has been received from the employee regarding the case <b>{doc.reference_name}</b>.<br><br><b>Message Content:</b><br>{doc.content}",
                    reference_doctype=doc.reference_doctype,
                    reference_name=doc.reference_name,
                    now=False
                )
        except Exception:
            frappe.log_error(frappe.get_traceback(), "HR CC Notification Failed on Reply")
