import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

class AttendanceCorrection(Document):
    def on_submit(self):
        # We might use on_update or a specific workflow action
        # But for now, let's assume we use a custom method for approval
        pass

    def on_update(self):
        # Use a flag to prevent recursion or repeated execution
        if self.status == "Approved" and not self.attendance_record:
            self.apply_correction()

    def apply_correction(self):
        """Update or create the Attendance record based on the request."""
        # "On Duty" is not a native Attendance status; store it as Present
        status = "Present" if self.requested_status == "On Duty" else self.requested_status

        # Find existing attendance
        att_name = frappe.db.get_value("Attendance", {
            "employee": self.employee,
            "attendance_date": self.attendance_date
        })

        attendance = None
        if att_name:
            attendance = frappe.get_doc("Attendance", att_name)
            if attendance.docstatus == 1:
                attendance.flags.ignore_permissions = True
                attendance.cancel()
            
            # Update and submit
            frappe.db.set_value("Attendance", attendance.name, "status", status)
            frappe.db.set_value("Attendance", attendance.name, "docstatus", 0)
            
            attendance = frappe.get_doc("Attendance", attendance.name)
            attendance.flags.ignore_permissions = True
            attendance.submit()
            self.attendance_record = attendance.name
        else:
            # Create new
            company = frappe.db.get_value("Employee", self.employee, "company")
            attendance = frappe.get_doc({
                "doctype": "Attendance",
                "employee": self.employee,
                "attendance_date": self.attendance_date,
                "status": status,
                "company": company
            })
            attendance.flags.ignore_permissions = True
            attendance.insert(ignore_permissions=True)
            attendance.submit()
            self.attendance_record = attendance.name

        # Update the approved_by and date if not set
        if not self.approved_by:
            self.approved_by = frappe.session.user
            self.approval_date = now_datetime()
            
        self.db_set("attendance_record", self.attendance_record)
        self.db_set("approved_by", self.approved_by)
        self.db_set("approval_date", self.approval_date)
