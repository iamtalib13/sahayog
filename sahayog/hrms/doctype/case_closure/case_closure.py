import frappe
from frappe.model.document import Document

class CaseClosure(Document):
    def autoname(self):
        if self.case_id:
            count = frappe.db.count("Case Closure", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-CLS-{count:02d}"
        else:
            self.name = frappe.model.naming.make_autoname("CLS-.#####")

    def before_insert(self):
        """Auto-fetch data from Domestic Enquiry or Enquiry Reminder if available"""
        if self.case_id:
            # Try to fetch from Domestic Enquiry
            de_data = frappe.db.get_value(
                "Domestic Enquiry",
                {"case_id": self.case_id},
                [
                    "domestic_enquiry",
                    "place_of_enquiry",
                    "status_of_response",
                    "date_of_enquiry",
                    "enquiry_officer_name",
                ],
                as_dict=True,
            )

            if de_data:
                for key, value in de_data.items():
                    if value and not self.get(key):
                        self.set(key, value)
            else:
                # Fallback to Enquiry Reminder if Domestic Enquiry not found
                er_data = frappe.db.get_value(
                    "Enquiry Reminder",
                    {"case_id": self.case_id},
                    [
                        "domestic_enquiry",
                        "place_of_enquiry",
                        "status_of_response",
                        "date_of_enquiry",
                        "enquiry_officer_name",
                        "enquiry_status",
                        
                    ],
                    as_dict=True,
                )
                if er_data:
                    for key, value in er_data.items():
                        if value and not self.get(key):
                            self.set(key, value)


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
                frappe.db.set_value(doctype, d.name, "status", "Closed", update_modified=True)