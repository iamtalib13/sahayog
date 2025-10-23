import frappe
from frappe.model.document import Document
from frappe import _

class SuspensionProcess(Document):
    def autoname(self):
        """Generate structured name based on linked Disciplinary Case"""
        if self.case_id:
            count = frappe.db.count("Suspension Process", {"case_id": self.case_id}) + 1
            self.name = f"{self.case_id}-SUSP-{count:02d}"
        else:
            # fallback if case_id not linked
            self.name = frappe.model.naming.make_autoname("SUSP-.#####")

    def before_insert(self):
        """Restrict record creation if Suspension Required = No in parent case"""
        if self.case_id:
            case = frappe.get_doc("Disciplinary Case", self.case_id)
            if case.suspension_required == "No":
                frappe.throw(
                    _("You cannot create a Suspension Process because 'Suspension Required' is set to No in the linked Disciplinary Case."),
                    title=_("Action Restricted")
                )

    def validate(self):
        """Extra safety — block save if parent says No"""
        if self.case_id:
            case = frappe.get_doc("Disciplinary Case", self.case_id)
            if case.suspension_required == "No":
                frappe.throw(
                    _("Suspension Required is set to No in the linked Disciplinary Case. You cannot create or save this record."),
                    title=_("Validation Failed")
                )
