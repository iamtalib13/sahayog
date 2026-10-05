# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt
#
# L&D Notification Scheduled Tasks
# Called daily by hooks.py scheduler
#

import frappe
from frappe.utils import today, add_days, formatdate

from sahayog.agent_and_bdo.doctype.training.training import COMPLETION_FIELDS

# Invitation milestones (days before from_date). T-7 and T-3 use flags for
# double-run protection; T-2/T-1 are pure date matches (fire only that day).
INVITATION_7D_DAYS = 7
INVITATION_3D_DAYS = 3
INVITATION_DAILY_DAYS = (2, 1)


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


def _get_sender():
    """Configured From-address for L&D mails (None = system default).

    Set via Sahayog Settings > Email Permission > L&D Sender Email.
    The address must exist as an outgoing-enabled Email Account.
    """
    try:
        sender = (frappe.db.get_single_value("Sahayog Settings", "ld_sender_email") or "").strip()
        return sender or None
    except Exception:
        return None


def _fmt_time(t):
    if not t:
        return "—"
    try:
        return frappe.utils.get_time(t).strftime("%I:%M %p")
    except Exception:
        return str(t)


def send_training_invitations():
    """
    Daily task (10 AM): send Training Invitation mails.
    Schedule per training: T-7 (flag), T-3 (flag), then daily T-2, T-1.
    To: Employee-type participants; CC: trainer + additional_cc.
    Agent-type participants have no email — trainer + CC only.
    Dedup via Training.invitation_7d_sent / invitation_3d_sent flags.
    """
    if not _emails_enabled():
        return
    _send_milestone_invitations(INVITATION_7D_DAYS, "invitation_7d_sent")
    _send_milestone_invitations(INVITATION_3D_DAYS, "invitation_3d_sent")
    for days in INVITATION_DAILY_DAYS:
        _send_milestone_invitations(days, None)


def _send_milestone_invitations(days_before, flag_field):
    target_date = add_days(today(), days_before)
    filters = {
        "from_date": target_date,
        "docstatus": ["<", 2],
    }
    if flag_field:
        filters[flag_field] = 0

    trainings = frappe.db.get_all(
        "Training",
        filters=filters,
        fields=["name", "from_date", "to_date", "start_time", "end_time",
                "training_program", "is_adhoc", "trainer", "training_location",
                "training_type", "zone", "region", "district", "branch",
                "additional_cc"]
    )

    for training in trainings:
        to_emails, cc_emails = _get_invitation_emails(training)
        if not to_emails and not cc_emails:
            continue

        subject = _training_invitation_subject(training)
        message = _training_invitation_email_body(training)

        try:
            frappe.sendmail(
                recipients=to_emails or cc_emails,
                cc=cc_emails or None,
                sender=_get_sender(),
                subject=subject,
                message=message,
                expose_recipients="header",
                now=False,
            )
            if flag_field:
                frappe.db.set_value("Training", training.name, flag_field, 1)
        except Exception as e:
            frappe.log_error(f"Training invitation failed for {training.name}: {e}", "LD Notification")


def send_post_training_closures():
    """
    Daily safety net (9 AM): closure mails for trainings that ended yesterday
    and are Completed (all 5 checks) but closure not yet sent.
    Primary trigger is event-driven — send_closure_for_training() fires the
    moment status hits Completed via update_training_status.
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
        fields=["name"]
    )

    for training in trainings:
        try:
            send_closure_for_training(training.name)
        except Exception as e:
            frappe.log_error(f"Post-training closure failed for {training.name}: {e}", "LD Notification")


def send_closure_for_training(training_name):
    """Send the closure mail for one training right now (event-driven).

    Fires when status hits Completed (all 5 checks ticked). No-op when
    emails are disabled, the training isn't Completed yet, or the closure
    was already sent. Returns True when a mail was queued.
    """
    if not _emails_enabled():
        return False
    training = frappe.db.get_value(
        "Training",
        training_name,
        ["name", "from_date", "to_date", "training_program", "trainer",
         "training_location", "zone", "region", "district", "branch",
         "training_delivered", "attendance_marked", "pre_assessment_taken",
         "post_assessment_taken", "feedback_taken", "trainer_remarks",
         "closure_sent", "docstatus", *COMPLETION_FIELDS],
        as_dict=True,
    )
    if not training or (training.docstatus or 0) >= 2:
        return False
    if training.closure_sent:
        return False
    if not all(training.get(f) for f in COMPLETION_FIELDS):
        return False

    recipients = _get_closure_recipients(training)
    if not recipients:
        return False

    subject = f"Training Completed — {training.training_program or 'L&D Training'} | {_fmt_date(training.from_date)} - {_fmt_date(training.to_date)}"
    message = _post_training_email_body(training)
    frappe.sendmail(recipients=recipients, sender=_get_sender(), subject=subject, message=message, expose_recipients="header", now=False)
    frappe.db.set_value("Training", training_name, "closure_sent", 1)
    frappe.db.commit()
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Email body builders
# ─────────────────────────────────────────────────────────────────────────────


def _post_training_email_body(t):
    def tick(val): return "✅ Yes" if val else "❌ No"

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#166534;border-bottom:2px solid #dcfce7;padding-bottom:8px">
        ✅ Training Completed
      </h2>
      <p>Dear Trainer / Branch Manager,</p>
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

    Placeholder mapping (available data only):
      Training Name     -> training_program
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
      www.sahayogmultistate.com</p>
    </div>
    """


# ─────────────────────────────────────────────────────────────────────────────
# Recipient helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_invitation_emails(training):
    """(To, CC) emails for the training invitation.

    To: Employee-type participants only.
    CC: trainer + Training.additional_cc (comma-separated).
    Agent-type participants have no email in the system — skipped.
    Fallback: when no participant email exists, trainer moves to To
    so the mail is still delivered (empty To is not allowed).
    """
    to_emails = set()

    participants = frappe.db.get_all(
        "Training Participant",
        filters={"parent": training.name if not isinstance(training, dict) else training.get("name"), "parenttype": "Training"},
        fields=["reference_doctype", "agent_employee"]
    )
    for p in participants:
        if (p.reference_doctype or "Employee") != "Employee":
            continue
        if p.agent_employee:
            email = frappe.db.get_value("Employee", p.agent_employee, "company_email") \
                 or frappe.db.get_value("Employee", p.agent_employee, "personal_email")
            if email:
                to_emails.add(email)

    cc_emails = set()
    trainer_email = _trainer_email(training.trainer if isinstance(training, dict) else getattr(training, "trainer", ""))
    if trainer_email:
        cc_emails.add(trainer_email)

    raw_cc = training.get("additional_cc") if isinstance(training, dict) else getattr(training, "additional_cc", "")
    cc_emails.update(_parse_cc(raw_cc))

    if not to_emails and trainer_email:
        # No participant email (e.g. Agents-only training) — trainer to To.
        to_emails.add(trainer_email)
        cc_emails.discard(trainer_email)

    return sorted(to_emails), sorted(cc_emails)


def _parse_cc(raw):
    """Comma-separated CC string -> sorted unique email list."""
    out = set()
    for part in str(raw or "").replace(";", ",").split(","):
        email = part.strip()
        if email and "@" in email:
            out.add(email)
    return sorted(out)


def _trainer_email(trainer_name):
    """Employee email for the trainer (trainer field stores employee_name)."""
    if not trainer_name:
        return None
    return frappe.db.get_value(
        "Employee", {"employee_name": trainer_name}, "company_email"
    ) or frappe.db.get_value(
        "Employee", {"employee_name": trainer_name}, "personal_email"
    )


def _get_closure_recipients(training):
    """Trainer + Branch Managers (heads) of the training's branches.

    Branch Manager = active Employee posted at the branch (sol_id) with a
    manager designation — same rule as Agent.get_branch_managers.
    Covers legacy branch + multi-geography rows.
    """
    emails = set()

    trainer_email = _trainer_email(training.trainer)
    if trainer_email:
        emails.add(trainer_email)

    branch_codes = set()
    if training.branch:
        branch_codes.add(training.branch)
    try:
        geos = frappe.db.get_all(
            "Training Geography",
            filters={"parent": training.name},
            pluck="branch",
        )
        for code in geos or []:
            if code:
                branch_codes.add(code)
    except Exception:
        pass

    if branch_codes:
        rows = frappe.db.get_all(
            "Employee",
            filters={
                "sol_id": ["in", sorted(branch_codes)],
                "status": "Active",
                "designation": ["in", ["BRANCH MANAGER", "Asst. Branch Manager", "Branch Operation Manager"]],
            },
            fields=["company_email", "personal_email"],
        )
        for emp in rows:
            email = emp.company_email or emp.personal_email
            if email:
                emails.add(email)

    return sorted(emails)
