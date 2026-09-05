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
        self._sync_geographies()

    def validate(self):
        if self.from_date and self.to_date:
            if frappe.utils.getdate(self.to_date) < frappe.utils.getdate(self.from_date):
                frappe.throw(_("To Date cannot be before From Date."))
        if self.start_time and self.end_time:
            if frappe.utils.get_time(self.end_time) < frappe.utils.get_time(self.start_time):
                frappe.throw(_("End Time cannot be before Start Time."))
        self._validate_geographies()
        self._validate_no_holiday_sunday()

    def _sync_geographies(self):
        if self.get("geographies"):
            for row in self.geographies:
                if row.branch:
                    geo = frappe.db.get_value(
                        "Sahayog Branch", row.branch, ["zone", "region", "district"], as_dict=True
                    )
                    if geo:
                        row.zone = geo.zone or row.zone or ""
                        row.region = geo.region or row.region or ""
                        row.district = geo.district or row.district or ""
            first = self.geographies[0]
            self.branch = first.branch or self.branch
            self.zone = first.zone or self.zone
            self.region = first.region or self.region
            self.district = first.district or self.district
        elif self.branch:
            geo = frappe.db.get_value(
                "Sahayog Branch", self.branch, ["zone", "region", "district"], as_dict=True
            )
            zone = (geo.zone if geo else None) or self.zone or ""
            region = (geo.region if geo else None) or self.region or ""
            district = (geo.district if geo else None) or self.district or ""
            self.append("geographies", {
                "branch": self.branch,
                "zone": zone,
                "region": region,
                "district": district,
            })

    def _validate_geographies(self):
        if self.get("geographies"):
            seen = set()
            for row in self.geographies:
                if not row.branch:
                    frappe.throw(_("Branch is required in Geographies table (row {0}).").format(row.idx))
                if row.branch in seen:
                    frappe.throw(_("Duplicate branch '{0}' in Geographies.").format(row.branch))
                seen.add(row.branch)

    def _validate_no_holiday_sunday(self):
        if not self.from_date:
            return
        from_d = frappe.utils.getdate(self.from_date)
        to_d = frappe.utils.getdate(self.to_date or self.from_date)
        # Collect states from geographies (or legacy branch)
        states = set()
        geos = self.get("geographies") or []
        branches = [g.branch for g in geos if g.branch] if geos else ([self.branch] if self.branch else [])
        for br in branches:
            state = frappe.db.get_value("Sahayog Branch", br, "state")
            if state:
                states.add(state)
        # Also include current user's state via Employee.holiday_list fallback if no branch state
        if not states:
            try:
                emp_branch = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "sahayog_branch")
                if emp_branch:
                    s = frappe.db.get_value("Sahayog Branch", emp_branch, "state")
                    if s:
                        states.add(s)
            except Exception:
                pass
        # Build holiday set for the date range
        holiday_map = {}
        for state in states:
            # Try Employee.holiday_list style: Holiday List name is "{State} - YYYY"
            for yr in range(from_d.year, to_d.year + 1):
                hl = f"{state} - {yr}"
                if not frappe.db.exists("Holiday List", hl):
                    hl = frappe.db.get_value("Holiday List", {"holiday_list_name": ["like", f"{state} - %"]}, "name")
                    if not hl:
                        continue
                rows = frappe.db.get_all("Holiday", filters={"parent": hl}, fields=["holiday_date", "description"])
                for r in rows:
                    d = frappe.utils.getdate(r.holiday_date)
                    if from_d <= d <= to_d:
                        holiday_map[str(d)] = r.description or "Holiday"
        # Check each date in range
        curr = from_d
        while curr <= to_d:
            d_str = str(curr)
            if curr.weekday() == 6:
                frappe.throw(_("Training cannot be scheduled on Sunday: {0}").format(d_str))
            if d_str in holiday_map:
                frappe.throw(_("Training cannot be scheduled on Holiday ({0}): {1}").format(holiday_map[d_str], d_str))
            curr = frappe.utils.add_days(curr, 1)

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