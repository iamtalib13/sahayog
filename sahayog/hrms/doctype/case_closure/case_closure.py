import frappe
from frappe.model.document import Document


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
            "date_of_enquiry",
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


# improve validation and error on approver email missing
@frappe.whitelist()
def start_verification_process(approvers=None, case_id=None):
    import json

    if not approvers:
        approvers = frappe.form_dict.get("approvers")

    if isinstance(approvers, str):
        approvers = json.loads(approvers)

    if not approvers:
        frappe.throw("Approver list is required.")

    if not case_id:
        case_id = frappe.form_dict.get("case_id")

    if not case_id:
        frappe.throw("Case ID missing.")

    # Send emails dynamically
    for ap in approvers:
        email = ap.get("company_email")
        emp_name = ap.get("employee_name")

        if not email:
            frappe.throw("Email missing for an approver.")

        frappe.sendmail(
            recipients=[email],
            subject="Case Closure Approval Required",
            message=f"""
                Dear {emp_name or 'Approver'},
                Please review and approve the case closure for Case ID: {case_id}.
            """
        )

    return {"status": "success", "message": "Verification emails sent."}

