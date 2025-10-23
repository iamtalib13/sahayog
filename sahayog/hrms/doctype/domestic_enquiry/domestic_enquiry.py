import frappe
from frappe.model.document import Document

class DomesticEnquiry(Document):
    def autoname(self):
        if self.case_id:
            count = frappe.db.count("Domestic Enquiry", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-ENQ-{count:02d}"
        else:
            self.name = frappe.model.naming.make_autoname("ENQ-.#####")

    def validate(self):
        """Restrict creation if linked Response to SCN is Satisfactory"""
        if self.case_id:
            status = frappe.db.get_value(
                "Response to SCN",
                {"case_id": self.case_id},
                "status_of_response"
            )
            if status == "Satisfactory":
                frappe.throw(
                    _("Cannot create Domestic Enquiry when 'Status of Response' is 'Satisfactory'."),
                    title=_("Action Restricted")
                )
