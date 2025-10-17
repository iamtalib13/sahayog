import frappe
from frappe.model.document import Document

class DomesticEnquiry(Document):
    def autoname(self):
        if self.case_id:
            count = frappe.db.count("Domestic Enquiry", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-ENQ-{count:02d}"
        else:
            self.name = frappe.model.naming.make_autoname("ENQ-.#####")
