# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

COMPLETION_FIELDS = [
    "training_delivered",
    "attendance_marked",
    "pre_assessment_taken",
    "post_assessment_taken",
    "feedback_taken",
]


def get_training_status(doc, for_date=None):
    """
    Derive the calendar status of a Training.

    Draft          -> not yet submitted (docstatus 0)
    Completed      -> submitted and all 5 completion checks ticked
    In Progress    -> submitted and 1-4 completion checks ticked
    Upcoming       -> submitted, 0 checks, on/after today
    Pending        -> submitted, 0 checks, before today
    """
    if doc.docstatus == 0:
        return "Draft"

    score = sum(1 for f in COMPLETION_FIELDS if doc.get(f))
    if score == len(COMPLETION_FIELDS):
        return "Completed"
    if score > 0:
        return "In Progress"

    ref = for_date or frappe.utils.getdate()
    end = doc.to_date or doc.from_date
    training_date = frappe.utils.getdate(end) if end else None
    if training_date and training_date >= ref:
        return "Upcoming"
    return "Pending"


class Training(Document):
    def before_insert(self):
        if not self.trainer:
            self.set_trainer_from_user()

    def before_save(self):
        self.status = get_training_status(self)

    def validate(self):
        if self.from_date and self.to_date:
            if frappe.utils.getdate(self.to_date) < frappe.utils.getdate(self.from_date):
                frappe.throw(_("To Date cannot be before From Date."))
        if self.start_time and self.end_time:
            if frappe.utils.get_time(self.end_time) < frappe.utils.get_time(self.start_time):
                frappe.throw(_("End Time cannot be before Start Time."))

    def on_submit(self):
        status = get_training_status(self)
        if status != self.status:
            frappe.db.set_value("Training", self.name, "status", status)

    def set_trainer_from_user(self):
        # System Manager / Administrator may create trainings without a linked Employee
        roles = frappe.get_roles(frappe.session.user)
        if "Administrator" in roles or "System Manager" in roles:
            return
        employee = frappe.db.get_value(
            "Employee", {"user_id": frappe.session.user}, ["name", "employee_name"], as_dict=True
        )
        if not employee:
            frappe.throw(_("No active Employee is linked to your account. Please contact the L&D Admin."))
        self.trainer = employee.employee_name


@frappe.whitelist()
def get_branch_geo(branch):
    """Return zone / region / district for a Sahayog Branch (autofill on the form)."""
    if not branch:
        return {}
    geo = frappe.db.get_value(
        "Sahayog Branch", branch, ["zone", "region", "district"], as_dict=True
    )
    return geo or {}


@frappe.whitelist()
def get_branch_employees(branch, enabled_only=True):
    """Return employees posted at a branch to auto-fill the participants table."""
    if not branch:
        return []
    filters = {"sahayog_branch": branch}
    if enabled_only:
        filters["status"] = "Active"
    rows = frappe.db.get_all(
        "Employee", filters=filters, fields=["name", "employee_name"], order_by="employee_name asc"
    )
    return rows