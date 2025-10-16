from frappe.model.document import Document
import frappe

class ResponsetoSCN(Document):

    def autoname(self):
        if self.case_id:
            count = frappe.db.count("Response to SCN", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-RSCN-{count:02d}"
        else:
            self.name = frappe.model.naming.make_autoname("RSCN-.#####")
