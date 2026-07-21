import frappe
import json
from frappe.model.document import Document
from frappe.utils import now_datetime
from frappe.utils import getdate
# from urllib.parse import urlencode # <--- URL encoding ke liye zaroori import

# Decorator to check whether email notifications are enabled from HR settings
from sahayog.hrms.doctype.reminder_of_unauthorized_absence.reminder_of_unauthorized_absence import send_reminder_unauthorized_absence_email
from sahayog.hrms.doctype.sahayog_hr_setting.sahayog_hr_setting import (
    email_notification_enabled
)


class CaseClosure(Document):
    """
    Controller for Case Closure DocType.
    Handles autonaming and server-side business logic.
    """

    def validate(self):
        self.validate_verified_transition()
        self.validate_closure_fields_access()

    # def validate_closure_fields_access(self):
    #     controlled_fields = [
    #         "remarks",
    #         "enquiry_status",
    #         "enquiry_report_upload",
    #         "case_close_with",
    #     ]

    #     allowed_roles = {"Administrator", "HR Manager", "HR Support Executive"}

    #     user_roles = set(frappe.get_roles(frappe.session.user))
    #     has_allowed_role = "Administrator" in user_roles or bool(
    #         user_roles.intersection(allowed_roles))

    #     all_reviews_submitted = (
    #         len(self.review_details) > 0 and
    #         all(
    #             row.employee_id and
    #             row.remarks and
    #             str(row.remarks).strip() and
    #             str(row.status or "").strip().lower() == "submitted"
    #             for row in self.review_details
    #         )
    #     )

    #     if self.is_new():
    #         return

    #     old_doc = self.get_doc_before_save()
    #     if not old_doc:
    #         return

    #     changed_restricted_field = any(
    #         old_doc.get(fieldname) != self.get(fieldname)
    #         for fieldname in controlled_fields
    #     )

    #     if not changed_restricted_field:
    #         return

    #     if not has_allowed_role:
    #         frappe.throw(
    #             "Only HR Manager, HR Support Executive, or Administrator can update Remarks, Enquiry Status, Enquiry Report Upload, and Case Close With."
    #         )

    #     if not all_reviews_submitted:
    #         frappe.throw(
    #             "These fields can be edited only after all employees in Review Details have submitted their feedback."
    #         )

    def validate_closure_fields_access(self):
        controlled_fields = ["remarks", "enquiry_status",
                             "enquiry_report_upload",
                             "case_close_with"]
        allowed_roles = {"Administrator", "HR Support Executive",
                         "HR Support Manager", "HR Manager"}

        if self.is_new():
            return

        old_doc = self.get_doc_before_save()
        if not old_doc:
            return

        changed = any(old_doc.get(f) != self.get(f) for f in controlled_fields)
        if not changed:
            return

        user_roles = set(frappe.get_roles(frappe.session.user))
        has_allowed_role = bool(user_roles.intersection(
            allowed_roles)) or "Administrator" in user_roles

        if not has_allowed_role:
            frappe.throw(
                "Only HR Manager, HR Support Executive, HR Support Manager, or Administrator can update closure fields."
            )

        all_reviews_submitted = len(self.review_details) > 0 and all(
            row.employee_id and row.remarks and str(row.remarks).strip() and str(
                row.status or "").strip().lower() == "submitted"
            for row in self.review_details
        )

        if not all_reviews_submitted and self.status != "Verified":
            frappe.throw(
                "Closure fields can be edited only after all reviewers have submitted feedback.")

    # def validate_closure_fields_access(self):
    #     controlled_fields = ["remarks", "enquiry_status",
    #                          "enquiry_report_upload", "case_close_with"]

    #     allowed_roles = {"Administrator", "HR Support Executive",
    #                      "HR Manager", "HR Support Manager"}
    #     user_roles = set(frappe.get_roles(frappe.session.user))
    #     has_allowed_role = bool(user_roles.intersection(
    #         allowed_roles)) or "Administrator" in user_roles

    #     old_doc = self.get_doc_before_save()
    #     if not old_doc:
    #         return

    #     changed = any(old_doc.get(f) != self.get(f) for f in controlled_fields)
    #     if not changed:
    #         return

    #     if not has_allowed_role:
    #         frappe.throw(
    #             "Only HR Manager, HR Support Executive, HR Support Manager, or Administrator can update closure fields."
    #         )

    #     all_reviews_submitted = (
    #         len(self.review_details) > 0 and
    #         all(
    #             row.employee_id and row.remarks and str(row.remarks).strip() and
    #             str(row.status or "").strip().lower() == "submitted"
    #             for row in self.review_details
    #         )
    #     )

    #     if not all_reviews_submitted and self.status != "Verified":
    #         frappe.throw(
    #             "Closure fields can be edited only after all reviewers have submitted feedback."
    #         )

    # def validate_verified_transition(self):
        if self.is_new():
            return

        old_doc = self.get_doc_before_save()
        if not old_doc:
            return

        moving_to_verified = old_doc.status != "Verified" and self.status == "Verified"
        if not moving_to_verified:
            return

        if not self.review_details:
            frappe.throw("Please select reviewers before approving the case.")

        pending_reviews = [
            row.employee_id for row in self.review_details
            if not row.remarks or str(row.status or "").strip().lower() != "submitted"
        ]
        if pending_reviews:
            frappe.throw(
                "All reviewers must submit feedback before approving.")

        required_fields = {
            "remarks": "Remarks",
            "enquiry_status": "Enquiry Status",
            # "enquiry_report_upload": "Enquiry Report Upload",
            "case_close_with": "Case Close With",
        }

        missing = [label for field, label in required_fields.items()
                   if not self.get(field)]
        if missing:
            frappe.throw(
                "Please fill the following fields before approving: " + ", ".join(missing))

    def validate_verified_transition(self):
        if self.is_new():
            return

        old_doc = self.get_doc_before_save()
        if not old_doc:
            return

        moving_to_verified = old_doc.status != "Verified" and self.status == "Verified"
        if not moving_to_verified:
            return

        if not self.review_details:
            frappe.throw("Please select reviewers before approving the case.")

        pending_reviews = [
            row.employee_id for row in self.review_details
            if not row.remarks or str(row.status or "").strip().lower() != "submitted"
        ]

        if pending_reviews:
            frappe.throw(
                "All reviewers must submit feedback before approving.")

        required_fields = {
            "remarks": "Remarks",
            "enquiry_status": "Enquiry Status",
            # "enquiry_report_upload": "Enquiry Report Upload",
            "case_close_with": "Case Close With",
        }

        missing = [label for field, label in required_fields.items()
                   if not self.get(field)]
        if missing:
            frappe.throw(
                "Please fill the following fields before approving: " +
                ", ".join(missing)
            )

    def autoname(self):
        if self.case_id:
            count = frappe.db.count(
                "Case Closure", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-CLS-{count:02d}"
        else:
            self.name = frappe.model.naming.make_autoname("CLS-.#####")

    def before_insert(self):
        """
        Populate info from source document.
        Strictly relies on explicit reference_doctype and reference_name.
        """

        # ----------------------------------------------------------------------
        # LEGACY AUTO-DETECTION (Commented out as per request)
        # ----------------------------------------------------------------------
        # if not self.reference_doctype and self.case_id:
        #     if frappe.db.exists("Disciplinary Case", self.case_id):
        #         self.reference_doctype = "Disciplinary Case"
        #         self.reference_name = self.case_id
        #     elif frappe.db.exists("Unauthorized Absence", self.case_id):
        #         self.reference_doctype = "Unauthorized Absence"
        #         self.reference_name = self.case_id
        # ----------------------------------------------------------------------

        if self.reference_doctype and self.reference_name:

            source_doc = frappe.get_doc(
                self.reference_doctype,
                self.reference_name
            )

            # ✅ FIXED: Fetch actual case_id from source document
            self.case_id = source_doc.get("case_id") or source_doc.name

            # Unified Field Mapping
            self.employee_id = source_doc.get("employee_id")
            self.employee_name = source_doc.get("employee_name")
            self.designation = source_doc.get("designation")
            self.branch_id = source_doc.get("branch_id")
            self.branch_name = source_doc.get("branch_name")

            self.zone_name = (
                source_doc.get("zone_name")
                or source_doc.get("zone")
            )

            self.issue_in_details = (
                source_doc.get("issue_in_details")
                or source_doc.get("description")
            )

            self.case_type = source_doc.get("case_type")
            self.category = source_doc.get("category")

            self.issue_reported_to_hr = (
                source_doc.get("issue_reported_to_hr")
                or source_doc.get("issue_report_to_hr")
            )

            self.issue_occurrence_date = source_doc.get(
                "issue_occurrence_date")

# ✅ ONLY ADDITION — existing logic untouched
    def on_submit(self):
        """
        Auto-send Case Closure email on submit.
        [DISABLED TEMPORARILY]
        """
        return
        try:
            emp = frappe.get_doc("Employee", self.employee_id)

            # Do not block submit if email missing
            if not emp.company_email:
                frappe.msgprint(
                    "Case Closure submitted successfully, but email was not sent because employee email is missing.",
                    indicator="orange"
                )
                return

            send_case_closure_email(self.name)

            frappe.msgprint(
                "Case Closure submitted successfully and email sent to employee.",
                indicator="green"
            )

        except Exception:
            # Never block submit
            frappe.log_error(
                frappe.get_traceback(),
                "Auto Case Closure Email Failed on Submit"
            )


# ---------------------------------------------------------
# FETCH CONSOLIDATED CASE AND EMPLOYEE INFORMATION
# ---------------------------------------------------------
@frappe.whitelist()
def get_reference_details(reference_doctype, reference_name):
    """
    Returns consolidated details from the source document
    for client-side population in Case Closure.
    """
    if not reference_doctype or not reference_name:
        return {}

    source_doc = frappe.get_doc(reference_doctype, reference_name)

    data = {
        "case_id": source_doc.get("case_id") or source_doc.name,
        "employee_id": source_doc.get("employee_id"),
        "employee_name": source_doc.get("employee_name"),
        "designation": source_doc.get("designation"),
        "branch_id": source_doc.get("branch_id"),
        "branch_name": source_doc.get("branch_name"),
        "zone_name": source_doc.get("zone_name") or source_doc.get("zone"),
        "issue_in_details": source_doc.get("issue_in_details") or source_doc.get("description"),
        "case_type": source_doc.get("case_type") or ("Unauthorized Absence" if reference_doctype in ["Unauthorized Absence", "Reminder Of Unauthorized Absence", "Ex Parte Enquiry"] else None),
        "category": source_doc.get("category"),
        "issue_reported_to_hr": source_doc.get("issue_reported_to_hr") or source_doc.get("issue_report_to_hr"),
        "issue_occurrence_date": source_doc.get("issue_occurrence_date"),
    }

    # Field Mappings by Doctype
    if reference_doctype == "Response to SCN":
        data.update({
            "status_of_response": source_doc.get("status_of_response"),
        })

    elif reference_doctype in ["Domestic Enquiry", "Enquiry Reminder"]:
        data.update({
            "domestic_enquiry": source_doc.get("domestic_enquiry"),
            "status_of_response": source_doc.get("status_of_response"),
            "place_of_enquiry": source_doc.get("place_of_enquiry"),
            "date_of_enquiry": source_doc.get("date_of_enquiry") or source_doc.get("date_of_2nd_enquiry"),
            "enquiry_officer_name": source_doc.get("enquiry_officer_name"),
        })

    elif reference_doctype in [
        "Unauthorized Absence",
        "Reminder Of Unauthorized Absence"
    ]:
        data.update({
            "status_of_response": source_doc.get("status_of_response"),
        })

    elif reference_doctype == "Ex Parte Enquiry":
        data.update({
            "date_of_enquiry": source_doc.get("date_of_enquiry"),
            "enquiry_officer_name": source_doc.get("enquiry_officer_name"),
        })

    return data


# ============================================================================
# CLOSE ALL LINKED DOCUMENTS AFTER CASE CLOSURE SUBMISSION
# ============================================================================
@frappe.whitelist()
def close_linked_case(case_id):
    """
    Close all documents linked to a Case ID.

    🔒 IMPORTANT:
    - This function is allowed ONLY after Case Closure is submitted.
    - It marks all related documents' status as 'Closed'."""

    # 1️⃣ Fetch Case Closure safely
    case_closure = frappe.get_all(
        "Case Closure",
        filters={"case_id": case_id},
        fields=["name", "docstatus"],
        limit=1
    )
    # Case Closure must exist
    if not case_closure:
        frappe.throw("Case Closure not found for this Case ID")

    case_closure = case_closure[0]

    # Ensure Case Closure is submitted
    if case_closure.docstatus != 1:
        frappe.throw(
            "Case Closure must be submitted before closing linked cases"
        )

    # All DAMS-related doctypes linked via case_id
    linked_doctypes = [
        "Disciplinary Case",
        "Suspension Process",
        "Response to SCN",
        "Unauthorized Absence",
        "Reminder Of Unauthorized Absence",
        "Ex Parte Enquiry",
        "Domestic Enquiry",
        "Enquiry Reminder",
    ]

    # Iterate through each linked doctype
    for doctype in linked_doctypes:
        # Skip if DocType is not installed
        if not frappe.db.exists("DocType", doctype):
            continue
         # Fetch active (non-closed) documents
        docs = frappe.get_all(
            doctype,
            filters={
                "case_id": case_id,
                "status": ["!=", "Closed"]
            },
            fields=["name", "docstatus"]
        )

        for d in docs:
            doc = frappe.get_doc(doctype, d.name)

            # Do not touch cancelled documents
            if doc.docstatus == 2:
                continue

             # Update status safely
            if hasattr(doc, "status"):
                doc.status = "Closed"
                doc.save(ignore_permissions=True)

    frappe.db.commit()

# ============================================================================
# FETCH LATEST LINKED ENQUIRY DETAILS FOR CASE HISTORY
# ============================================================================


@frappe.whitelist()
def get_latest_linked_enquiry(case_id):
    """
    Returns the most recently modified enquiry-related document
    linked to a Case ID.

    Used for:
    - Case History timeline
    - Dynamic UI rendering in Case Closure
    """
    if not case_id:
        return {}

    docs = []

    # -----------------------------
    # Response to SCN (Only if Satisfactory)
    # -----------------------------
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

    # -----------------------------
    # Domestic Enquiry
    # -----------------------------
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

        # Normalize date for UI safety
        if d.get("date_of_enquiry"):
            d["date_of_enquiry"] = getdate(d["date_of_enquiry"])

        docs.append({
            "doctype": "Domestic Enquiry",
            "name": d.name,
            "modified": d.modified,
            "data": d,
        })

    # -----------------------------
    # Enquiry Reminder
    # -----------------------------
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
        ],
        order_by="modified desc",
        limit=1,
    )
    if er:
        e = er[0]

        # Normalize date for UI safety
        if e.get("date_of_2nd_enquiry"):
            e["date_of_2nd_enquiry"] = getdate(e["date_of_2nd_enquiry"])

        docs.append({
            "doctype": "Enquiry Reminder",
            "name": e.name,
            "modified": e.modified,
            "data": e,
        })

    if not docs:
        return {}

    # Return the most recently modified document
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
    """
    Sends simple system-generated emails to approvers
    to notify them that Case Closure review is required.
    """
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
            sender="dcm@sahayogmultistate.com",
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

    # Load linked Case (Generic fallback to Disciplinary Case for old records)
    ref_doctype = closure_doc.reference_doctype or "Disciplinary Case"
    ref_name = closure_doc.reference_name or closure_doc.case_id

    if not ref_name:
        return {"message": {"status": "error", "msg": "Reference Case ID not found"}}

    parent_case = frappe.get_doc(ref_doctype, ref_name)

    # -----------------------------
    # Parse Approvers
    # -----------------------------
    if isinstance(approvers, str):
        approvers = json.loads(approvers)

    if not approvers:
        return {"message": {"status": "error", "msg": "No approvers selected"}}

    email_list = [a.get("company_email")
                  for a in approvers if a.get("company_email")]

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
    doc_context = {
        # From Parent Case (Disciplinary or Unauthorized)
        "case_id": parent_case.name,
        "employee_name": parent_case.employee_name,
        "employee_id": parent_case.employee_id,
        "region": parent_case.get("region"),
        "zone": parent_case.get("zone") or parent_case.get("zone_name"),
        "case_type": parent_case.get("case_type"),

        # FIX: Agar workflow_state nahi hai, toh status use karein ya ise khali chodein
        "stage": parent_case.get("workflow_state") or parent_case.get("status") or "N/A",
        "hr_name": parent_case.get("hr_name") or parent_case.get("hr_employee_id"),
        "hr_employee_id": parent_case.get("hr_employee_id"),

        # From Case Closure (REQUIRED AS PER YOUR REQUEST)
        "remarks": closure_doc.remarks,
        # "attachment": closure_doc.enquiry_report_upload or "No attachment found",

        # CASE HISTORY REPORT LINK (CORRECT)
        "case_history_link": f"{get_url()}/app/sahayog-home"
    }
    context = {"doc": doc_context}

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
            sender="dcm@sahayogmultistate.com",
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

# @frappe.whitelist()
# @email_notification_enabled
# def send_email_for_review(case_id=None, approvers=None):
#     import json
#     from frappe.utils import get_url

#     # Validate Case ID
#     if not case_id:
#         return {"message": {"status": "error", "msg": "Missing Case ID"}}

#     # Load Case Closure
#     closure_doc = frappe.get_doc("Case Closure", case_id)

#     # Load linked Disciplinary Case
#     disc_case = frappe.get_doc("Disciplinary Case", closure_doc.case_id)

#     # -----------------------------
#     # Parse Approvers
#     # -----------------------------
#     if isinstance(approvers, str):
#         approvers = json.loads(approvers)

#     if not approvers:
#         return {"message": {"status": "error", "msg": "No approvers selected"}}

#     email_list = [a.get("company_email") for a in approvers if a.get("company_email")]

#     if not email_list:
#         return {"message": {"status": "error", "msg": "No valid approver email found"}}

#     # -----------------------------
#     # Load Email Template
#     # -----------------------------
#     try:
#         template = frappe.get_doc("Email Template", "Disciplinary Case Update")
#     except:
#         return {"message": {"status": "error", "msg": "Email Template Not Found"}}

#     template_html = template.response_html or template.response or ""
#     template_subject = template.subject or "Case Review Started"

#     # ---------------------------------------------------------
#     # ✅ DYNAMIC URL GENERATION (Optimized & Reliable)
#     # ---------------------------------------------------------
#     # Report ke filters ko dictionary mein define kiya hai
#     report_filters = {
#         "case_id": disc_case.name,
#         "doctype_filter": "All",
#         "sort_by": "Creation Date",
#         "show_versions": 1
#     }

#     # urlencode use karne se "Case History" aur "Case ID" ke spaces automatically handle ho jayenge
#     base_url = f"{get_url()}/app/query-report/Case%20History"
#     case_history_link = f"{base_url}?{urlencode(report_filters)}"

#     # -----------------------------
#     # CONTEXT for template
#     # -----------------------------
#     context = {
#         # From Disciplinary Case
#         "case_id": disc_case.name,
#         "employee_name": disc_case.employee_name,
#         "employee_id": disc_case.employee_id,
#         "region": disc_case.region,
#         "zone": disc_case.zone,
#         "case_type": disc_case.case_type,
#         "stage": disc_case.workflow_state,
#         "hr_name": disc_case.hr_name,
#         "hr_employee_id": disc_case.hr_employee_id,

#         # From Case Closure
#         "remarks": closure_doc.remarks,
#         "attachment": closure_doc.enquiry_report_upload or "No attachment found",

#         # Optimized Link
#         "case_history_link": case_history_link
#     }

#     # -----------------------------
#     # Render Template
#     # -----------------------------
#     rendered_subject = frappe.render_template(template_subject, context)
#     rendered_message = frappe.render_template(template_html, context)

#     # -----------------------------
#     # SEND EMAIL
#     # -----------------------------
#     try:
#         frappe.sendmail(
#             recipients=email_list,
#             subject=rendered_subject,
#             message=rendered_message,
#             now=True,
#         )
#     except Exception as e:
#         return {
#             "message": {
#                 "status": "error",
#                 "msg": "Email sending failed: " + frappe.get_traceback(),
#             }
#         }

#     # Success message
#     return {
#         "status": "ok",
#         "msg": "Verification email sent successfully."
#     }


# ---------------------------------------------------------
# Get Employee Email of Case against Employee
# ---------------------------------------------------------
@frappe.whitelist()
def check_employee_email(employee):
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None


# ---------------------------------------------------------
# Send Case Closure Email to Employee
# ---------------------------------------------------------
@frappe.whitelist()
def send_case_closure_email(docname, print_format=None):

    doc = frappe.get_doc("Case Closure", docname)
    emp = frappe.get_doc("Employee", doc.employee_id)

    if not emp.company_email:
        frappe.throw("No email found for this employee.")

    # Load Email Template
    template = frappe.get_doc("Email Template", "Case Closure Update")
    
    # Use standard 'doc' context for consistency with standardized templates
    context = {"doc": doc}
    
    message = frappe.render_template(template.response_html, context)
    subject = frappe.render_template(template.subject, context)

    # Attach selected print format if provided
    attachments = []
    if print_format:
        attachments.append(
            frappe.attach_print(
                doctype="Case Closure",
                name=docname,
                print_format=print_format,
                file_name=f"{docname}.pdf"
            )
        )

    frappe.sendmail(
        recipients=[emp.company_email],
        sender="dcm@sahayogmultistate.com",
        subject=subject,
        message=message,
        attachments=attachments,
        reference_doctype="Case Closure",
        reference_name=docname,
        now=False
    )

    return "Email Sent"
# ============================================================================
# FETCH EMPLOYEE LINKED TO LOGGED-IN USER
# ============================================================================


@frappe.whitelist()
def get_employee_from_user():
    """
    Returns the Employee ID linked to the currently logged-in user.

    Used for:
    - Identifying reviewer based on session user
    - Case History review permission checks
    """
    emp = frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        "name"
    )
    return emp


@frappe.whitelist()
def case_history_can_review(case_id, reviewer):
    """Check if logged-in employee is assigned as reviewer"""

    # Fetch Case Closure name using case_id
    cc_name = frappe.db.get_value("Case Closure", {"case_id": case_id}, "name")
    # No Case Closure found → cannot review
    if not cc_name:
        return False   # or None (important)
     # Load Case Closure document
    cc_doc = frappe.get_doc("Case Closure", cc_name)
    # Iterate through reviewer child table
    ignore_permissions = True   # 🔥 REQUIRED
    for r in cc_doc.get("review_details"):
        if r.employee_id == reviewer:
            return True
    return False


# ============================================================================
# CHECK IF REVIEW IS STILL PENDING FOR REVIEWER
# ============================================================================
@frappe.whitelist()
def reviewer_pending_review(case_id, reviewer):
    """
    Checks whether the reviewer has a pending review action."""

   # Fetch Case Closure name using case_id
    cc_name = frappe.db.get_value("Case Closure", {"case_id": case_id}, "name")
    # Case Closure missing → no pending review
    if not cc_name:
        return False   # or None (important)
    # Load Case Closure document
    cc_doc = frappe.get_doc("Case Closure", cc_name)
    ignore_permissions = True   # 🔥 REQUIRED
    # Check reviewer row
    for r in cc_doc.get("review_details"):
        if r.employee_id == reviewer:
            return not bool(r.remarks)
    return False

# ============================================================================
# SUBMIT REVIEWER REMARKS FROM CASE HISTORY
# ============================================================================


@frappe.whitelist()
def case_history_submit_review(case_id, reviewer, remarks):
    """
    Saves reviewer remarks against Case Closure review_details.

    Validations:
    - Case ID, reviewer, and remarks must be present
    - Reviewer must be assigned to the case

    Updates:
    - Remarks
    - Review status
    - Date & time of submission
    """
    try:
        # Mandatory value check
        if not case_id or not reviewer or not remarks:
            frappe.throw("Missing required values")

        # Fetch Case Closure name
        cc_name = frappe.db.get_value(
            "Case Closure", {"case_id": case_id}, "name")
        if not cc_name:
            return False   # or None (important)

        cc_doc = frappe.get_doc("Case Closure", cc_name)
        ignore_permissions = True   # 🔥 REQUIRED
        # Identify reviewer row
        reviewer_row = None
        for row in cc_doc.review_details:
            if row.employee_id == reviewer:
                reviewer_row = row
                break
        # Reviewer not assigned
        if not reviewer_row:
            frappe.throw("You are not assigned as reviewer for this case")
        # Save reviewer inputs
        reviewer_row.remarks = remarks
        reviewer_row.status = "Submitted"   # ✅ VALID VALUE
        reviewer_row.date_and_time = frappe.utils.now()
        # Save Case Closure with permission override
        cc_doc.save(ignore_permissions=True)
        frappe.db.commit()

        return True

    except Exception:
        # Log technical error for debugging
        frappe.log_error(
            frappe.get_traceback(),
            "Case History Review Submit Error"
        )
        frappe.throw("Unable to submit review")


# ============================================================================
# SYNC REVIEWER EMAIL SENT STATUS
# ============================================================================
# @frappe.whitelist()
# def sync_reviewer_mail_checkbox(case_closure_name):
#     """
#     Updates 'mail_sent' flag in review_details child table
#     based on Email Queue status.

#     Purpose:
#     - Visually track whether reviewer notification email was delivered
#     - Avoid duplicate notifications
#     """

#     if not case_closure_name:
#         return
#     # Load Case Closure document
#     cc_doc = frappe.get_doc("Case Closure", case_closure_name)
#     updated = False

#     for row in cc_doc.review_details:

#         # already checked → skip
#         if row.mail_sent:
#             continue

#         if not row.employee_id:
#             continue

#         # 🔹 Fetch employee email (since child table has no email field)
#         emp_email = frappe.db.get_value(
#             "Employee",
#             row.employee_id,
#             ["company_email", "prefered_email"],
#         )

#         if isinstance(emp_email, (list, tuple)):
#             emp_email = emp_email[0] or emp_email[1]

#         if not emp_email:
#             continue

#         # 🔍 Check Email Queue Recipient
#         sent = frappe.db.exists(
#             "Email Queue Recipient",
#             {
#                 "recipient": emp_email,
#                 "status": "Sent"
#             }
#         )

#         if sent:
#             row.mail_sent = 1
#             updated = True
#      # Save only if changes were made
#     if updated:
#         cc_doc.save(ignore_permissions=True)
#         frappe.db.commit()


@frappe.whitelist()
def sync_reviewer_mail_checkbox(case_closure_name):
    """
    Updates 'mail_sent' flag in review_details child table
    based on Email Queue status.

    Purpose:
    - Visually track whether reviewer notification email was delivered
    - Avoid duplicate notifications
    """

    if not case_closure_name:
        return {"updated": False}

    cc_doc = frappe.get_doc("Case Closure", case_closure_name)
    updated = False

    for row in cc_doc.review_details:
        if row.mail_sent:
            continue

        if not row.employee_id:
            continue

        emp_email = frappe.db.get_value(
            "Employee",
            row.employee_id,
            ["company_email", "prefered_email"],
        )

        if isinstance(emp_email, (list, tuple)):
            emp_email = emp_email[0] or emp_email[1]

        if not emp_email:
            continue

        sent = frappe.db.exists(
            "Email Queue Recipient",
            {
                "recipient": emp_email,
                "status": "Sent"
            }
        )

        if sent:
            row.mail_sent = 1
            updated = True

    if updated:
        cc_doc.save(ignore_permissions=True)
        frappe.db.commit()

    return {"updated": updated}


# @frappe.whitelist()
# def submit_feedback(case_closure_name, feedback):
#     if not case_closure_name or not feedback:
#         frappe.throw("Case Closure and feedback are required.")

#     employee = frappe.db.get_value(
#         "Employee",
#         {"user_id": frappe.session.user},
#         "name"
#     ) or frappe.db.get_value(
#         "Employee",
#         {"user_id": frappe.session.user},
#         "name"
#     )

#     if not employee:
#         frappe.throw("No Employee is linked with the logged-in user.")

#     doc = frappe.get_doc("Case Closure", case_closure_name)

#     matched_row = None
#     for row in doc.review_details:
#         if row.employee_id == employee:
#             matched_row = row
#             break

#     if not matched_row:
#         frappe.throw(
#             "You are not assigned in Review Details for this document.")

#     matched_row.remarks = feedback
#     matched_row.status = "Submitted"
#     matched_row.date_and_time = now_datetime()

#     doc.save(ignore_permissions=True)
#     frappe.db.commit()

#     return {"status": "success", "employee": employee}


@frappe.whitelist()
def get_employee_from_current_user_for_review(case_closure_name):
    employee = frappe.db.get_value(
        "Employee", {"user_id": frappe.session.user}, "name")

    if not employee:
        return {"allowed": False}

    doc = frappe.get_doc("Case Closure", case_closure_name)
    allowed = any(row.employee_id == employee for row in doc.review_details)

    return {
        "allowed": allowed,
        "employee": employee
    }


@frappe.whitelist()
def can_submit_feedback(case_closure_name):
    if not case_closure_name:
        return {"allowed": False, "reason": "Missing document."}

    current_employee = frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        "name"
    ) or frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        "name"
    )

    if not current_employee:
        return {"allowed": False, "reason": "No Employee linked with current user."}

    doc = frappe.get_doc("Case Closure", case_closure_name)

    active_row = None
    for row in doc.review_details:
        if not row.remarks or str(row.status).strip().lower() != "submitted":
            active_row = row
            break

    if not active_row:
        return {
            "allowed": False,
            "reason": "All reviewers have already submitted.",
            "employee": current_employee
        }

    return {
        "allowed": active_row.employee_id == current_employee,
        "employee": current_employee,
        "active_employee": active_row.employee_id,
        "reason": None if active_row.employee_id == current_employee else "Feedback is pending from another reviewer first."
    }


@frappe.whitelist()
def submit_feedback(case_closure_name, feedback):
    if not case_closure_name:
        frappe.throw("Case Closure is required.")
    if not feedback or not str(feedback).strip():
        frappe.throw("Feedback is required.")

    current_employee = frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        "name"
    ) or frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        "name"
    )

    if not current_employee:
        frappe.throw("No Employee linked with current user.")

    doc = frappe.get_doc("Case Closure", case_closure_name)

    active_row = None
    for row in doc.review_details:
        if not row.remarks or str(row.status).strip().lower() != "submitted":
            active_row = row
            break

    if not active_row:
        frappe.throw("All reviewers have already submitted feedback.")

    if active_row.employee_id != current_employee:
        frappe.throw(
            "You cannot submit feedback yet. Previous reviewer is pending.")

    active_row.remarks = feedback.strip()
    active_row.status = "Submitted"
    active_row.date_and_time = now_datetime()

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "status": "success",
        "employee": current_employee,
        "next_employee": get_next_pending_reviewer(doc)
    }


def get_next_pending_reviewer(doc):
    for row in doc.review_details:
        if not row.remarks or str(row.status).strip().lower() != "submitted":
            return row.employee_id
    return None


def validate_closure_fields_access(self):
    controlled_fields = [
        "remarks",
        "enquirystatus",
        "enquiryreportupload",
        "caseclosewith",
    ]

    allowed_roles = {"Administrator", "HR Manager", "HR Support Executive"}

    user_roles = set(frappe.get_roles(frappe.session.user))
    has_allowed_role = "Administrator" in user_roles or bool(
        user_roles.intersection(allowed_roles))

    all_reviews_submitted = (
        len(self.review_details) > 0 and
        all(
            row.employee_id and
            row.remarks and
            str(row.remarks).strip() and
            str(row.status or "").strip().lower() == "submitted"
            for row in self.review_details
        )
    )

    if self.is_new():
        return

    old_doc = self.get_doc_before_save()
    if not old_doc:
        return

    changed_restricted_field = any(
        old_doc.get(fieldname) != self.get(fieldname)
        for fieldname in controlled_fields
    )

    if not changed_restricted_field:
        return

    if not has_allowed_role:
        frappe.throw(
            "Only HR Manager, HR Support Executive, or Administrator can update Remarks, Enquiry Status, Enquiry Report Upload, and Case Close With."
        )

    if not all_reviews_submitted:
        frappe.throw(
            "These fields can be edited only after all employees in Review Details have submitted their feedback."
        )
