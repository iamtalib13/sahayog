import frappe
from frappe.model.document import Document

class CaseClosure(Document):
    def autoname(self):
        if self.case_id:
            count = frappe.db.count("Case Closure", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-CLS-{count:02d}"
        else:
            self.name = frappe.model.naming.make_autoname("CLS-.#####")
