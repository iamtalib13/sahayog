# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe

# Comma-separated MIS HO email addresses for the monthly report.
# Change here (no separate settings doctype needed).
MIS_RECIPIENT_EMAILS = "mis@example.com"


def get_context(context):
    context.no_cache = 1
    context.safe_render = False  # HTML has JS with window.ldFn.* patterns; disable Jinja safe_render scan
    if frappe.session.user == "Guest":
        frappe.throw("Please login to access the L&D Dashboard.", frappe.PermissionError)


# ─────────────────────────────────────────────────────────────────────────────
# Role helpers
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_user_role_info():
    """Return current user's L&D role context for dashboard rendering."""
    roles = frappe.get_roles(frappe.session.user)
    user = frappe.session.user

    is_ld_admin    = "L&D Admin" in roles or "System Manager" in roles or "Administrator" in roles
    is_ld_trainer  = "Trainer" in roles or "Trainer Head" in roles
    is_ld_viewer   = "L&D Viewer" in roles

    # Get linked employee for geo-based filtering
    employee = frappe.db.get_value("Employee", {"user_id": user}, ["name", "custom_zone", "custom_region", "custom_district", "sahayog_branch"], as_dict=True)
    if employee:
        employee = {
            "name": employee.name,
            "zone": employee.custom_zone,
            "region": employee.custom_region,
            "district": employee.custom_district,
            "sahayog_branch": employee.sahayog_branch,
        }

    return {
        "user": user,
        "is_ld_admin": is_ld_admin,
        "is_ld_trainer": is_ld_trainer,
        "is_ld_viewer": is_ld_viewer,
        "employee": employee or {},
        "roles": roles
    }


def _safe_year_month(year, month):
    """Coerce year/month to valid ints; fall back to today's date on bad input."""
    try:
        year = int(year)
        month = int(month)
    except (TypeError, ValueError):
        today = frappe.utils.getdate()
        year, month = today.year, today.month
    if month < 1 or month > 12:
        today = frappe.utils.getdate()
        year, month = today.year, today.month
    if year < 2000 or year > 2100:
        year = frappe.utils.getdate().year
    return year, month


# ─────────────────────────────────────────────────────────────────────────────
# Calendar data
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_ld_calendar_data(year, month, zone=None, region=None, district=None, branch=None):
    """Fetch all L&D trainings for a given month with status info."""
    import calendar

    filters = {
        "ld_training": 1,
        "docstatus": ["<", 2]
    }

    year, month = _safe_year_month(year, month)
    last_day = calendar.monthrange(year, month)[1]
    filters["date"] = ["between", [f"{year}-{month:02d}-01", f"{year}-{month:02d}-{last_day}"]]

    if zone:    filters["zone"] = zone
    if region:  filters["region"] = region
    if district: filters["district"] = district
    if branch:  filters["branch"] = branch

    fields = [
        "name", "date", "start_time", "end_time", "training_program", "topic",
        "trainer", "branch", "zone", "region", "district",
        "training_location", "is_adhoc", "trainer_remarks",
        "training_delivered", "attendance_marked",
        "pre_assessment_taken", "post_assessment_taken", "feedback_taken",
        "docstatus"
    ]

    trainings = frappe.db.get_all("Meeting", filters=filters, fields=fields, order_by="date asc")

    trainer_ids = list({t.trainer for t in trainings if t.trainer})
    trainer_map = {}
    if trainer_ids:
        for emp in frappe.db.get_all("Employee", filters={"name": ["in", trainer_ids]},
                                      fields=["name", "employee_name"]):
            trainer_map[emp.name] = emp.employee_name

    for t in trainings:
        t.trainer_name = trainer_map.get(t.trainer, t.trainer or "")
        t.completion_score = _completion_score(t)

    return trainings


def _completion_score(t):
    """0-5 score: how many of the 5 status checkboxes are ticked."""
    fields = ["training_delivered", "attendance_marked",
              "pre_assessment_taken", "post_assessment_taken", "feedback_taken"]
    return sum(1 for f in fields if t.get(f))


# ─────────────────────────────────────────────────────────────────────────────
# Status overview (summary tiles)
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_status_overview(year, month, zone=None, region=None, district=None):
    """Aggregate training status counts for the status overview tab."""
    import calendar

    year, month = _safe_year_month(year, month)
    last_day = calendar.monthrange(year, month)[1]

    base = {
        "ld_training": 1,
        "docstatus": ["<", 2],
        "date": ["between", [f"{year}-{month:02d}-01", f"{year}-{month:02d}-{last_day}"]]
    }
    if zone:     base["zone"] = zone
    if region:   base["region"] = region
    if district: base["district"] = district

    rows = frappe.db.get_all("Meeting", filters=base,
        fields=["name", "training_delivered", "attendance_marked",
                "pre_assessment_taken", "post_assessment_taken",
                "feedback_taken", "is_adhoc"])

    total      = len(rows)
    delivered  = sum(1 for r in rows if r.training_delivered)
    attendance = sum(1 for r in rows if r.attendance_marked)
    pre_assess = sum(1 for r in rows if r.pre_assessment_taken)
    post_assess= sum(1 for r in rows if r.post_assessment_taken)
    feedback   = sum(1 for r in rows if r.feedback_taken)
    adhoc      = sum(1 for r in rows if r.is_adhoc)
    fully_done = sum(1 for r in rows if _completion_score(r) == 5)

    return {
        "total": total,
        "delivered": delivered,
        "pending": total - delivered,
        "attendance_marked": attendance,
        "pre_assessment": pre_assess,
        "post_assessment": post_assess,
        "feedback": feedback,
        "adhoc": adhoc,
        "fully_complete": fully_done
    }


# ─────────────────────────────────────────────────────────────────────────────
# Inline status update
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def update_training_status(meeting_name, field, value):
    """
    Trainer updates a single status checkbox from dashboard card.
    Allowed fields: training_delivered, attendance_marked,
                    pre_assessment_taken, post_assessment_taken, feedback_taken,
                    trainer_remarks
    """
    ALLOWED = {
        "training_delivered", "attendance_marked",
        "pre_assessment_taken", "post_assessment_taken", "feedback_taken",
        "trainer_remarks"
    }
    if field not in ALLOWED:
        frappe.throw(f"Field '{field}' is not allowed for status update.")

    doc = frappe.get_doc("Meeting", meeting_name)

    # Permission: only trainer who owns it, L&D Admin, or System Manager
    roles = frappe.get_roles(frappe.session.user)
    is_admin = "L&D Admin" in roles or "System Manager" in roles or "Administrator" in roles
    is_owner = doc.owner == frappe.session.user or doc.trainer == frappe.db.get_value(
        "Employee", {"user_id": frappe.session.user}, "name")

    if not is_admin and not is_owner:
        frappe.throw("You don't have permission to update this training's status.")

    # db.set_value works on Draft and Submitted docs alike (lightweight, no re-save)
    frappe.db.set_value("Meeting", meeting_name, field, value)
    return {"success": True}


# ─────────────────────────────────────────────────────────────────────────────
# Geography filters
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_geo_options():
    """Return distinct Zone, Region, District values sourced from Sahayog Branch."""
    rows = frappe.db.sql("""
        select distinct zone, region, district
        from `tabSahayog Branch`
        where (zone is not null and zone != '')
           or (region is not null and region != '')
           or (district is not null and district != '')
    """, as_dict=True)

    zones, regions, districts = set(), set(), set()
    for r in rows:
        if r.zone:     zones.add(r.zone)
        if r.region:   regions.add(r.region)
        if r.district: districts.add(r.district)

    return {
        "zones":     sorted(zones),
        "regions":   sorted(regions),
        "districts": sorted(districts)
    }


# ─────────────────────────────────────────────────────────────────────────────
# MIS Monthly Report (preview + direct email, L&D Admin only)
# ─────────────────────────────────────────────────────────────────────────────

def _compose_mis_report(year, month, zone=None):
    """Build the monthly MIS report payload (subject, recipients, counts, message)."""
    roles = frappe.get_roles(frappe.session.user)
    if not ("L&D Admin" in roles or "System Manager" in roles or "Administrator" in roles):
        frappe.throw("Only L&D Admin can access the MIS report.")

    recipients = [e.strip() for e in MIS_RECIPIENT_EMAILS.split(",") if e.strip()]
    if not recipients:
        frappe.throw("No MIS recipient emails configured.")

    month_names = ["January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"]
    year, month = _safe_year_month(year, month)
    month_label = month_names[month - 1]

    overview = get_status_overview(year, month, zone=zone)

    subject = f"L&D Monthly Training Report — {month_label} {year}"
    zone_label = f"Zone: {zone}" if zone else "PAN India"

    message = f"""
    <h3>L&D Monthly Training Report</h3>
    <p><b>Period:</b> {month_label} {year} | {zone_label}</p>
    <table style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:600">Total Trainings</td>
          <td style="padding:6px 12px">{overview['total']}</td></tr>
      <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:600">Delivered</td>
          <td style="padding:6px 12px">{overview['delivered']}</td></tr>
      <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:600">Pending</td>
          <td style="padding:6px 12px">{overview['pending']}</td></tr>
      <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:600">Attendance Marked</td>
          <td style="padding:6px 12px">{overview['attendance_marked']}</td></tr>
      <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:600">Pre-Assessment</td>
          <td style="padding:6px 12px">{overview['pre_assessment']}</td></tr>
      <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:600">Post-Assessment</td>
          <td style="padding:6px 12px">{overview['post_assessment']}</td></tr>
      <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:600">Feedback Taken</td>
          <td style="padding:6px 12px">{overview['feedback']}</td></tr>
      <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:600">Ad-hoc Trainings</td>
          <td style="padding:6px 12px">{overview['adhoc']}</td></tr>
    </table>
    <p style="color:#666;font-size:12px">
      Sent by: {frappe.session.user} | This is a system-generated report from the L&D Training System.
    </p>
    """

    return {
        "period": f"{month_label} {year}",
        "zone_label": zone_label,
        "subject": subject,
        "recipients": recipients,
        "data": overview,
        "message": message,
    }


@frappe.whitelist()
def get_mis_preview(year, month, zone=None):
    """Return the MIS report preview (no email is sent)."""
    report = _compose_mis_report(year, month, zone)
    report.pop("message", None)
    return report


@frappe.whitelist()
def send_mis_report(year, month, zone=None):
    """L&D authority validates (by clicking) and emails the monthly training
    summary directly to MIS HO recipients."""
    report = _compose_mis_report(year, month, zone)
    frappe.sendmail(recipients=report["recipients"], subject=report["subject"],
                    message=report["message"], now=True)
    return {"sent_to": report["recipients"], "subject": report["subject"]}
