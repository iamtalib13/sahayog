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
    Dedup via Meeting.pre_reminder_sent flag.
    """
    target_date = add_days(today(), PRE_TRAINING_REMINDER_DAYS)

    trainings = frappe.db.get_all(
        "Meeting",
        filters={
            "ld_training": 1,
            "date": target_date,
            "pre_reminder_sent": 0,
            "docstatus": ["<", 2]
        },
        fields=["name", "date", "start_time", "training_program", "topic",
                "trainer", "training_location", "zone", "region", "district", "branch"]
    )

    for training in trainings:
        recipients = _get_training_recipients(training)
        if not recipients:
            continue

        subject = f"Reminder: Training Tomorrow — {training.training_program or training.topic or 'L&D Training'}"
        message = _pre_training_email_body(training)

        try:
            frappe.sendmail(recipients=recipients, subject=subject, message=message, now=False)
            frappe.db.set_value("Meeting", training.name, "pre_reminder_sent", 1)
        except Exception as e:
            frappe.log_error(f"Pre-training reminder failed for {training.name}: {e}", "LD Notification")


def send_post_training_closures():
    """
    Daily task: Send closure mails for L&D trainings that were yesterday
    and have training_delivered = 1 but closure not yet sent.
    Dedup via Meeting.closure_sent flag.
    """
    yesterday = add_days(today(), -1)

    trainings = frappe.db.get_all(
        "Meeting",
        filters={
            "ld_training": 1,
            "date": yesterday,
            "training_delivered": 1,
            "closure_sent": 0,
            "docstatus": ["<", 2]
        },
        fields=["name", "date", "training_program", "topic", "trainer",
                "training_location", "zone", "region", "district", "branch",
                "training_delivered", "attendance_marked", "pre_assessment_taken",
                "post_assessment_taken", "feedback_taken", "trainer_remarks"]
    )

    for training in trainings:
        recipients = _get_district_leader_emails(training)
        if not recipients:
            continue

        subject = f"Training Completed — {training.training_program or training.topic or 'L&D Training'} | {_fmt_date(training.date)}"
        message = _post_training_email_body(training)

        try:
            frappe.sendmail(recipients=recipients, subject=subject, message=message, now=False)
            frappe.db.set_value("Meeting", training.name, "closure_sent", 1)
        except Exception as e:
            frappe.log_error(f"Post-training closure failed for {training.name}: {e}", "LD Notification")


# ─────────────────────────────────────────────────────────────────────────────
# Email body builders
# ─────────────────────────────────────────────────────────────────────────────

def _pre_training_email_body(t):
    trainer_name = ""
    if t.trainer:
        trainer_name = frappe.db.get_value("Employee", t.trainer, "employee_name") or t.trainer

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#1d4ed8;border-bottom:2px solid #dbeafe;padding-bottom:8px">
        📅 Training Reminder
      </h2>
      <p>Dear Participant,</p>
      <p>This is a reminder for the upcoming L&amp;D training session.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#64748b;width:160px">Training Program</td>
            <td style="padding:6px 0;font-weight:600">{t.training_program or t.topic or "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Date</td>
            <td style="padding:6px 0;font-weight:600">{_fmt_date(t.date)}</td></tr>
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
            <td style="padding:6px 0;font-weight:600">{t.training_program or t.topic or "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Date</td>
            <td style="padding:6px 0">{_fmt_date(t.date)}</td></tr>
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


# ─────────────────────────────────────────────────────────────────────────────
# Recipient helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_training_recipients(training):
    """Get participant emails + trainer email for pre-training reminder."""
    emails = set()

    if training.trainer:
        trainer_email = frappe.db.get_value("Employee", training.trainer, "company_email") \
                     or frappe.db.get_value("Employee", training.trainer, "personal_email")
        if trainer_email:
            emails.add(trainer_email)

    attendees = frappe.db.get_all(
        "Attendees",
        filters={"parent": training.name, "parenttype": "Meeting"},
        fields=["reference_doctype", "agent_employee"]
    )
    for a in attendees:
        if a.reference_doctype == "Employee":
            email = frappe.db.get_value("Employee", a.agent_employee, "company_email") \
                 or frappe.db.get_value("Employee", a.agent_employee, "personal_email")
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
        email = frappe.db.get_value("Employee", training.trainer, "company_email") \
             or frappe.db.get_value("Employee", training.trainer, "personal_email")
        if email:
            emails.add(email)

    return list(emails)
