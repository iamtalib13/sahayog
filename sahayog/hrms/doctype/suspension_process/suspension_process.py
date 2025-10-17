import frappe
from frappe.model.document import Document

class SuspensionProcess(Document):
    def autoname(self):
        if self.case_id:
            # Count existing suspension records linked to this case
            count = frappe.db.count("Suspension Process", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-SUSP-{count:02d}"
        else:
            # Fallback if case_id not linked
            self.name = frappe.model.naming.make_autoname("SUSP-.#####")
