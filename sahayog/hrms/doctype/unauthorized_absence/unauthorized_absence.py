import frappe
from frappe.model.document import Document
from frappe.utils import formatdate

class UnauthorizedAbsence(Document):

    def autoname(self):
        from frappe.utils import getdate
        today = getdate()
        fy = today.year
        self.name = frappe.model.naming.make_autoname(f"UA-FY-{fy}-.####")

    def on_submit(self):
        try:
            from sahayog.utils.hr_utils import send_hr_workflow_email
            send_hr_workflow_email(self.name, "Unauthorized Absence")
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                "Unauthorized Absence Auto Email Failed"
            )

    def before_insert(self):
        user = frappe.session.user

        if user == "Administrator":
            self.hr_employee_id = "Administrator"
            self.hr_name = "Administrator"
            return

        hr_employee_data = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "employee_name"]
        )

        if hr_employee_data:
            self.hr_employee_id, self.hr_name = hr_employee_data
        else:
            frappe.throw("Please set User ID in Employee record.")

    def after_insert(self):
        self.db_set("case_id", self.name, update_modified=False)

@frappe.whitelist()
def check_employee_email(employee):
    """Return employee's email if exists, otherwise None."""
    emp = frappe.get_doc("Employee", employee)
    return emp.company_email if emp.company_email else None

@frappe.whitelist()
def send_unauthorized_absence_email(docname):
    """Send Unauthorized Absence Email using centralized dynamic utility."""
    from sahayog.utils.hr_utils import send_hr_workflow_email
    # Falls back to "Unauthorized Absence" for template and print format
    return send_hr_workflow_email(docname, "Unauthorized Absence")


