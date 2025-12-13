import frappe
import json
from frappe.model.document import Document
from frappe.utils import now_datetime
from sahayog.hrms.doctype.sahayog_hr_setting.sahayog_hr_setting import (
    email_notification_enabled
)

class CaseClosure(Document):
    def autoname(self):
        if self.case_id:
            count = frappe.db.count("Case Closure", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-CLS-{count:02d}"
        else:
            self.name = frappe.model.naming.make_autoname("CLS-.#####")


@frappe.whitelist()
def close_linked_case(case_id):
    """Marks all linked docs for a case_id as Closed (if they have a status field)."""
    linked_doctypes = [
        "Disciplinary Case",
        "Suspension Process",
        "Response to SCN",
        "Unauthorized Absence",
        "Reminder Of Unauthorized Absence",
        "Domestic Enquiry",
        "Enquiry Reminder",
    ]

    for doctype in linked_doctypes:
        if not frappe.db.exists("DocType", doctype):
            continue

        for d in frappe.get_all(doctype, filters={"case_id": case_id}, fields=["name"]):
            if frappe.db.has_column(doctype, "status"):
                frappe.db.set_value(doctype, d.name, "status", "Closed", update_modified=True)

@frappe.whitelist()
def get_latest_linked_enquiry(case_id):
    """Determine the latest record in the case workflow and return all available field data."""
    if not case_id:
        return {}

    docs = []

    # Fetch latest Response to SCN
    rscn = frappe.get_all(
        "Response to SCN",
        filters={"case_id": case_id},
        fields=["name", "modified", "status_of_response", "domestic_enquiry"],
        order_by="modified desc",
        limit=1,
    )
    if rscn and rscn[0].status_of_response == "Satisfactory":
        docs.append({
            "doctype": "Response to SCN",
            "name": rscn[0].name,
            "modified": rscn[0].modified,
            "data": {
                "status_of_response": rscn[0].status_of_response,
                "domestic_enquiry": rscn[0].domestic_enquiry,
            },
        })

    # Fetch latest Domestic Enquiry
    de = frappe.get_all(
        "Domestic Enquiry",
        filters={"case_id": case_id},
        fields=[
            "name",
            "modified",
            "status_of_response",
            "domestic_enquiry",
            "place_of_enquiry",
            "date_of_enquiry",
            "enquiry_officer_name",
        ],
        order_by="modified desc",
        limit=1,
    )
    if de:
        d = de[0]
        docs.append({
            "doctype": "Domestic Enquiry",
            "name": d.name,
            "modified": d.modified,
            "data": d,
        })

    # Fetch latest Enquiry Reminder
    er = frappe.get_all(
        "Enquiry Reminder",
        filters={"case_id": case_id},
        fields=[
            "name",
            "modified",
            "status_of_response",
            "domestic_enquiry",
            "place_of_enquiry",
            "date_of_2nd_enquiry",
            "enquiry_officer_name",
            "enquiry_status",
        ],
        order_by="modified desc",
        limit=1,
    )
    if er:
        e = er[0]
        docs.append({
            "doctype": "Enquiry Reminder",
            "name": e.name,
            "modified": e.modified,
            "data": e,
        })

    if not docs:
        return {}

    # Pick the document with the latest modification
    latest_doc = max(docs, key=lambda x: x["modified"])

    return {
        "linked_enquiry_type": latest_doc["doctype"],
        "linked_enquiry": latest_doc["name"],
        "data": latest_doc["data"],
    }


# -------------------------------------------------------------------------
# START VERIFICATION PROCESS - SIMPLE EMAILS
# -------------------------------------------------------------------------
@frappe.whitelist()
def start_verification_process(approvers=None, case_id=None):
    import json

    if not approvers:
        approvers = frappe.form_dict.get("approvers")

    if isinstance(approvers, str):
        approvers = json.loads(approvers)

    if not approvers:
        return {"status": "error", "msg": "Approver list is required."}

    if not case_id:
        case_id = frappe.form_dict.get("case_id")

    if not case_id:
        return {"status": "error", "msg": "Case ID missing."}

    # Send simple system-generated verification mails
    for ap in approvers:
        email = ap.get("company_email")
        emp_name = ap.get("employee_name")

        if not email:
            return {"status": "error", "msg": "Email missing for an approver."}

        frappe.sendmail(
            recipients=[email],
            subject="Case Closure Approval Required",
            message=f"""
                Dear {emp_name or 'Approver'},
                Please review and approve the case closure for Case ID: {case_id}.
            """,
        )

    return {"status": "ok", "msg": "Verification emails sent."}


# -------------------------------------------------------------------------
# EMAIL TEMPLATE–BASED REVIEW MAIL
# -------------------------------------------------------------------------

def get_common_template(context):
    try:
        template = frappe.get_doc("Email Template", "Disciplinary Case Update")
        return frappe.render_template(template.response, context or {})
    except Exception:
        return "Disciplinary Case Update"

# -------------------------------------------------------------------------
# SEND EMAIL TO APPROVERS FOR CASE REVIEW
# -------------------------------------------------------------------------
@frappe.whitelist()
@email_notification_enabled
def send_email_for_review(case_id=None, approvers=None):
    import json
    from frappe.utils import get_url

    # Validate Case ID
    if not case_id:
        return {"message": {"status": "error", "msg": "Missing Case ID"}}

    # Load Case Closure
    closure_doc = frappe.get_doc("Case Closure", case_id)

    # Load linked Disciplinary Case
    disc_case = frappe.get_doc("Disciplinary Case", closure_doc.case_id)

    # -----------------------------
    # Parse Approvers
    # -----------------------------
    if isinstance(approvers, str):
        approvers = json.loads(approvers)

    if not approvers:
        return {"message": {"status": "error", "msg": "No approvers selected"}}

    email_list = [a.get("company_email") for a in approvers if a.get("company_email")]

    if not email_list:
        return {"message": {"status": "error", "msg": "No valid approver email found"}}

    # -----------------------------
    # Load Email Template
    # -----------------------------
    try:
        template = frappe.get_doc("Email Template", "Disciplinary Case Update")
    except:
        return {"message": {"status": "error", "msg": "Email Template Not Found"}}

    template_html = template.response_html or template.response or ""
    template_subject = template.subject or "Case Review Started"

    # -----------------------------
    # CONTEXT for template
    # -----------------------------
    context = {
        # From Disciplinary Case
        "case_id": disc_case.name,
        "employee_name": disc_case.employee_name,
        "employee_id": disc_case.employee_id,
        "region": disc_case.region,
        "zone": disc_case.zone,
        "case_type": disc_case.case_type,
        "stage": disc_case.workflow_state,
        "hr_name": disc_case.hr_name,
        "hr_employee_id": disc_case.hr_employee_id,

        # From Case Closure (REQUIRED AS PER YOUR REQUEST)
        "remarks": closure_doc.remarks,
        "attachment": closure_doc.enquiry_report_upload or "No attachment found",

        # CASE HISTORY REPORT LINK (CORRECT)
        "case_history_link": f"{get_url()}/app/query-report/Case History?case_id={disc_case.name}"
    }

    # -----------------------------
    # Render Template
    # -----------------------------
    rendered_subject = frappe.render_template(template_subject, context)
    rendered_message = frappe.render_template(template_html, context)

    # -----------------------------
    # SEND EMAIL
    # -----------------------------
    try:
        frappe.sendmail(
            recipients=email_list,
            subject=rendered_subject,
            message=rendered_message,
            now=True,
        )
    except Exception as e:
        return {
            "message": {
                "status": "error",
                "msg": "Email sending failed: " + frappe.get_traceback(),
            }
        }
# success message
    return {
    "status": "ok",
    "msg": "Verification email sent successfully."
}


from frappe.utils import formatdate

# ---------------------------------------------------------
# Get Employee Email
# ---------------------------------------------------------
@frappe.whitelist()
def check_employee_email(employee):
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None


# ---------------------------------------------------------
# Send Case Closure Email
# ---------------------------------------------------------
@frappe.whitelist()
def send_case_closure_email(docname):

    # Load Case Closure Document
    doc = frappe.get_doc("Case Closure", docname)
    emp = frappe.get_doc("Employee", doc.employee_id)

    # Check Email
    final_email = emp.company_email
    if not final_email:
        frappe.throw("No email found for this employee.")

    # Convert document to dictionary for templating
    doc_dict = doc.as_dict()

    # Add employee details
    doc_dict["employee_name"] = emp.employee_name
    doc_dict["employee_id"] = emp.name

    # Optional closure reason field
    doc_dict["closure_reason"] = doc.closure_reason if hasattr(doc, "closure_reason") else None

    # Format all known date fields if present
    date_fields = [
        "date_of_enquiry",
        "date_of_2nd_enquiry",
        "notice_issue_date",
        "issue_occurrence_date"
    ]

    for field in date_fields:
        if getattr(doc, field, None):
            doc_dict[field] = formatdate(getattr(doc, field))

    # Load Email Template
    template = frappe.get_doc("Email Template", "Case Closure Update")

    # Render Email Components
    subject = frappe.render_template(template.subject, doc_dict)
    message = frappe.render_template(template.response_html, doc_dict)

    # Send the Email
    frappe.sendmail(
        recipients=[final_email],
        subject=subject,
        message=message,
        attachments=[],
        reference_doctype="Case Closure",
        reference_name=docname,
        now=True
    )

    return "Email Sent Successfully"



@frappe.whitelist()
def get_employee_from_user():
    """Return Employee ID linked to logged-in user"""
    emp = frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        "name"
    )
    return emp


@frappe.whitelist()
def case_history_can_review(case_id, reviewer):
    """Check if logged-in employee is assigned as reviewer"""
    cc_doc = frappe.get_doc("Case Closure", {"case_id": case_id})
    for r in cc_doc.get("review_details"):
        if r.employee_id == reviewer:
            return True
    return False


@frappe.whitelist()
def reviewer_pending_review(case_id, reviewer):
    """Check if reviewer exists AND remarks not yet submitted"""
    cc_doc = frappe.get_doc("Case Closure", {"case_id": case_id})
    for r in cc_doc.get("review_details"):
        if r.employee_id == reviewer:
            return not bool(r.remarks)
    return False
@frappe.whitelist()
def case_history_submit_review(case_id, reviewer, remarks):
    try:
        if not case_id or not reviewer or not remarks:
            frappe.throw("Missing required values")

        cc_doc = frappe.get_doc("Case Closure", {"case_id": case_id})

        reviewer_row = None
        for row in cc_doc.review_details:
            if row.employee_id == reviewer:
                reviewer_row = row
                break

        if not reviewer_row:
            frappe.throw("You are not assigned as reviewer for this case")

        reviewer_row.remarks = remarks
        reviewer_row.status = "Submitted"   # ✅ VALID VALUE
        reviewer_row.date_and_time = frappe.utils.now()

        cc_doc.save(ignore_permissions=True)
        frappe.db.commit()

        return True

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Case History Review Submit Error"
        )
        frappe.throw("Unable to submit review")
