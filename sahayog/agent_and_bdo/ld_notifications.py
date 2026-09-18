# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt
#
# L&D Notification Scheduled Tasks
# Called daily by hooks.py scheduler
#

import frappe
from frappe.utils import today, add_days, formatdate

PRE_TRAINING_REMINDER_DAYS = 1


def _fmt_date(d):
    return formatdate(d, "dd-mm-YYYY") if d else "—"


def _emails_enabled():
    """Global on/off switch for L&D scheduler mails (Sahayog Settings).

    Defaults to enabled so existing behaviour is never broken (e.g. before
    the setting is synced, or if the field is missing).
    """
    try:
        return bool(
            frappe.db.get_single_value(
                "Sahayog Settings", "enable_ld_email_notifications"
            )
        )
    except Exception:
        return True


def _fmt_time(t):
    if not t:
        return "—"
    try:
        return frappe.utils.get_time(t).strftime("%I:%M %p")
    except Exception:
        return str(t)


def send_pre_training_reminders():
    """
    Daily task: Send reminder emails for L&D trainings scheduled N days from today.
    Dedup via Training.pre_reminder_sent flag.
    """
    if not _emails_enabled():
        return
    target_date = add_days(today(), PRE_TRAINING_REMINDER_DAYS)

    trainings = frappe.db.get_all(
        "Training",
        filters={
            "from_date": target_date,
            "pre_reminder_sent": 0,
            "docstatus": ["<", 2]
        },
        fields=["name", "from_date", "to_date", "start_time", "training_program",
                "trainer", "training_location", "zone", "region", "district", "branch"]
    )

    for training in trainings:
        recipients = _get_training_recipients(training)
        if not recipients:
            continue

        subject = f"Reminder: Training Tomorrow — {training.training_program or 'L&D Training'}"
        message = _pre_training_email_body(training)

        try:
            frappe.sendmail(recipients=recipients, subject=subject, message=message, now=False)
            frappe.db.set_value("Training", training.name, "pre_reminder_sent", 1)
        except Exception as e:
            frappe.log_error(f"Pre-training reminder failed for {training.name}: {e}", "LD Notification")


def send_post_training_closures():
    """
    Daily task: Send closure mails for L&D trainings that were yesterday
    and have training_delivered = 1 but closure not yet sent.
    Dedup via Training.closure_sent flag.
    """
    if not _emails_enabled():
        return
    yesterday = add_days(today(), -1)

    trainings = frappe.db.get_all(
        "Training",
        filters={
            "to_date": yesterday,
            "training_delivered": 1,
            "closure_sent": 0,
            "docstatus": ["<", 2]
        },
        fields=["name", "from_date", "to_date", "training_program", "trainer",
                "training_location", "zone", "region", "district", "branch",
                "training_delivered", "attendance_marked", "pre_assessment_taken",
                "post_assessment_taken", "feedback_taken", "trainer_remarks"]
    )

    for training in trainings:
        recipients = _get_district_leader_emails(training)
        if not recipients:
            continue

        subject = f"Training Completed — {training.training_program or 'L&D Training'} | {_fmt_date(training.from_date)} - {_fmt_date(training.to_date)}"
        message = _post_training_email_body(training)

        try:
            frappe.sendmail(recipients=recipients, subject=subject, message=message, now=False)
            frappe.db.set_value("Training", training.name, "closure_sent", 1)
        except Exception as e:
            frappe.log_error(f"Post-training closure failed for {training.name}: {e}", "LD Notification")


# ─────────────────────────────────────────────────────────────────────────────
# Email body builders
# ─────────────────────────────────────────────────────────────────────────────

def _pre_training_email_body(t):
    # trainer field now stores the name directly
    trainer_name = t.trainer or "—"

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#1d4ed8;border-bottom:2px solid #dbeafe;padding-bottom:8px">
        📅 Training Reminder
      </h2>
      <p>Dear Participant,</p>
      <p>This is a reminder for the upcoming L&amp;D training session.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#64748b;width:160px">Training Program</td>
            <td style="padding:6px 0;font-weight:600">{t.training_program or "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Date</td>
            <td style="padding:6px 0;font-weight:600">{_fmt_date(t.from_date)} - {_fmt_date(t.to_date)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Time</td>
            <td style="padding:6px 0">{_fmt_time(t.start_time)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Location</td>
            <td style="padding:6px 0">{t.training_location or "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Trainer</td>
            <td style="padding:6px 0">{trainer_name}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Zone / District</td>
            <td style="padding:6px 0">{t.zone or "—"} / {t.district or "—"}</td></tr>
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:24px">
        This is an automated reminder from the L&amp;D Training System.
      </p>
    </div>
    """


def _post_training_email_body(t):
    def tick(val): return "✅ Yes" if val else "❌ No"

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#166534;border-bottom:2px solid #dcfce7;padding-bottom:8px">
        ✅ Training Completed
      </h2>
      <p>Dear District Head / Leader,</p>
      <p>The following L&amp;D training has been completed. Here is the status update:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#64748b;width:160px">Training Program</td>
            <td style="padding:6px 0;font-weight:600">{t.training_program or "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Date</td>
            <td style="padding:6px 0">{_fmt_date(t.from_date)} - {_fmt_date(t.to_date)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Zone / District</td>
            <td style="padding:6px 0">{t.zone or "—"} / {t.district or "—"}</td></tr>
      </table>
      <h4 style="margin:16px 0 8px;color:#374151">Training Status Checklist</h4>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f8fafc"><td style="padding:7px 10px">Training Delivered</td>
            <td style="padding:7px 10px">{tick(t.training_delivered)}</td></tr>
        <tr><td style="padding:7px 10px">Attendance Marked</td>
            <td style="padding:7px 10px">{tick(t.attendance_marked)}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:7px 10px">Pre-Assessment Taken</td>
            <td style="padding:7px 10px">{tick(t.pre_assessment_taken)}</td></tr>
        <tr><td style="padding:7px 10px">Post-Assessment Taken</td>
            <td style="padding:7px 10px">{tick(t.post_assessment_taken)}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:7px 10px">Feedback Taken</td>
            <td style="padding:7px 10px">{tick(t.feedback_taken)}</td></tr>
      </table>
      {f'<p style="margin-top:14px;font-size:13px"><b>Trainer Remarks:</b> {t.trainer_remarks}</p>' if t.trainer_remarks else ""}
      <p style="color:#64748b;font-size:12px;margin-top:24px">
        This is an automated closure update from the L&amp;D Training System.
      </p>
    </div>
    """


def _training_invitation_subject(t):
    prog = t.get("training_program") if isinstance(t, dict) else getattr(t, "training_program", "")
    return f"Training Invitation: {prog or 'L&D Training'}"


def _training_invitation_email_body(t):
    """Training invitation mail template (client-shared format).

    Ready but NOT wired to any scheduler/sender yet — recipients and
    trigger (who/when/how) are still to be confirmed.

    Placeholder mapping (available data only):
      Training Name     -> training_program
      Training Category -> Planned / Ad-hoc (is_adhoc flag)
      Training Date     -> from_date - to_date
      Start/End Time    -> start_time / end_time
      Mode              -> training_type (Classroom / Virtual)
      Venue/Link        -> training_location
      Trainer           -> trainer (+ designation via Employee lookup)
      Zone / Location   -> zone / district-branch
      Target Audience   -> nominated participant names (Training Participant)
    """
    is_dict = isinstance(t, dict)
    g = (lambda k: t.get(k)) if is_dict else (lambda k: getattr(t, k, None))

    prog = g("training_program") or "L&D Training"
    category = "Ad-hoc / Need Based" if g("is_adhoc") else "Planned"
    date_label = _fmt_date(g("from_date"))
    if g("to_date") and str(g("to_date")) != str(g("from_date") or ""):
        date_label += " - " + _fmt_date(g("to_date"))
    mode = g("training_type") or "—"
    venue = g("training_location") or "To be shared"
    trainer_name = g("trainer") or "—"
    zone = g("zone") or "—"
    branch = g("branch") or ""
    district = g("district") or ""
    loc_bits = [x for x in [district or branch, zone] if x and x != "—"]
    zone_loc = " / ".join(loc_bits) if loc_bits else "—"

    trainer_designation = "—"
    if g("trainer"):
        trainer_designation = (
            frappe.db.get_value("Employee", {"employee_name": g("trainer")}, "designation")
            or "—"
        )

    participants = []
    try:
        tname = g("name")
        if tname:
            participants = frappe.db.get_all(
                "Training Participant",
                filters={"parent": tname, "parenttype": "Training"},
                fields=["full_name", "agent_employee"],
                order_by="idx asc",
            )
    except Exception:
        participants = []
    if participants:
        names = [p.full_name or p.agent_employee or "" for p in participants]
        names = [n for n in names if n]
        audience_lines = (
            f"{len(names)} nominated participant(s)<br>"
            + "<br>".join(frappe.utils.escape_html(n) for n in names)
        )
    else:
        audience_lines = "Nominated participants"

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <p>Dear Team,</p>
      <p>We are pleased to inform you that the following training program has been scheduled by the Learning &amp; Development Department.</p>
      <h3 style="color:#1d4ed8;border-bottom:2px solid #dbeafe;padding-bottom:8px">PROGRAM DETAILS</h3>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#64748b;width:190px">Training Program</td>
            <td style="padding:6px 0;font-weight:600">{frappe.utils.escape_html(prog)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Training Category</td>
            <td style="padding:6px 0">{category}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Date</td>
            <td style="padding:6px 0;font-weight:600">{date_label}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Time</td>
            <td style="padding:6px 0">{_fmt_time(g("start_time"))} - {_fmt_time(g("end_time"))}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Mode</td>
            <td style="padding:6px 0">{frappe.utils.escape_html(mode)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Venue / Meeting Link</td>
            <td style="padding:6px 0">{frappe.utils.escape_html(venue)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Trainer / Facilitator</td>
            <td style="padding:6px 0">{frappe.utils.escape_html(trainer_name)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Zone / Location</td>
            <td style="padding:6px 0">{frappe.utils.escape_html(zone_loc)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;vertical-align:top">Target Audience</td>
            <td style="padding:6px 0">{audience_lines}</td></tr>
      </table>
      <p>All nominated participants are requested to:</p>
      <ul style="color:#374151;line-height:1.7">
        <li>Ensure their availability and participation for the complete duration of the program.</li>
        <li>For Virtual Program - Join the session at least 5 minutes prior to the scheduled time.</li>
        <li>Complete any prescribed pre-work / LMS module, wherever applicable and instructed by the Facilitator.</li>
        <li>Ensure active participation throughout the learning session.</li>
        <li>Inform the concerned Reporting Manager and L&amp;D Team in advance in case of any unavoidable constraint.</li>
      </ul>
      <p>We look forward to your active participation and contribution towards a meaningful learning experience.</p>
      <br>
      <p style="margin:0">Regards,</p>
      <p style="margin:4px 0 0"><b>{frappe.utils.escape_html(trainer_name)}</b> ({frappe.utils.escape_html(trainer_designation)})<br>
      HR-Learning and Development<br>
      Mob. No: -----------<br>
      www.sahayogmultistate.com</p>
    </div>
    """


# ─────────────────────────────────────────────────────────────────────────────
# Recipient helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_training_recipients(training):
    """Get participant emails + trainer email for pre-training reminder."""
    emails = set()

    # trainer field now stores the name (string), not Employee ID
    if training.trainer:
        trainer_email = frappe.db.get_value(
            "Employee", {"employee_name": training.trainer}, "company_email"
        ) or frappe.db.get_value(
            "Employee", {"employee_name": training.trainer}, "personal_email"
        )
        if trainer_email:
            emails.add(trainer_email)

    participants = frappe.db.get_all(
        "Training Participant",
        filters={"parent": training.name, "parenttype": "Training"},
        fields=["employee"]
    )
    for p in participants:
        if p.employee:
            email = frappe.db.get_value("Employee", p.employee, "company_email") \
                 or frappe.db.get_value("Employee", p.employee, "personal_email")
            if email:
                emails.add(email)

    return list(emails)


def _get_district_leader_emails(training):
    """Get district head emails for post-training closure mail."""
    emails = set()

    if training.district:
        leaders = frappe.db.get_all(
            "Employee",
            filters={
                "custom_district": training.district,
                "designation": ["in", ["District Head", "Cluster Head", "Zonal Head"]],
                "status": "Active"
            },
            fields=["company_email", "personal_email"]
        )
        for emp in leaders:
            email = emp.company_email or emp.personal_email
            if email:
                emails.add(email)

    if not emails and training.trainer:
        email = frappe.db.get_value("Employee", {"employee_name": training.trainer}, "company_email") \
             or frappe.db.get_value("Employee", {"employee_name": training.trainer}, "personal_email")
        if email:
            emails.add(email)

    return list(emails)
