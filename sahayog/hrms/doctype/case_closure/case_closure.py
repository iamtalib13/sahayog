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
    """
    Update case_status to 'Closed' for all linked doctypes for a given case_id.
    """

    linked_doctypes = [
        "Disciplinary Case",
        "Suspension Process",
        "Response to SCN",
        "Domestic Enquiry",
        "Enquiry Reminder",
    ]

    for doctype in linked_doctypes:
        # Check if doctype exists in DB to avoid TableMissingError
        if frappe.db.exists("DocType", doctype):
            docs = frappe.get_all(doctype, filters={"case_id": case_id}, fields=["name"])
            for d in docs:
                # Directly set field and save without permission issues
                frappe.db.set_value(doctype, d.name, "case_status", "Closed", update_modified=True)