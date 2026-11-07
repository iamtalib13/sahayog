# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt
#
# L&D Notification Scheduled Tasks
# Called daily by hooks.py scheduler
#

import os
import shutil
import subprocess

import frappe
from frappe.utils import today, add_days, formatdate, getdate

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


def _get_flyer_attachments(training_name):
    """Return the training's flyer as sendmail attachments, or None.

    Stored in Training.flyer (Attach). A missing/unreadable file must never
    block an email, so failures are logged and the mail goes out without it.
    """
    try:
        url = frappe.db.get_value("Training", training_name, "flyer")
        if not url:
            return None
        file_name = frappe.db.get_value("File", {"file_url": url}, "name")
        if not file_name:
            return None
        file_doc = frappe.get_doc("File", file_name)
        content = file_doc.get_content()
        if not content:
            return None
        return [{"fname": file_doc.file_name or "flyer", "fcontent": content}]
    except Exception as e:
        frappe.log_error(
            f"Training flyer attach failed for {training_name}: {e}", "LD Notification"
        )
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
                attachments=_get_flyer_attachments(training.name),
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
         "training_delivered", "attendance_marked",
         "pre_assessment_taken", "post_assessment_taken", "feedback_taken",
         "trainer_remarks", "additional_cc", "closure_sent", "docstatus",
         "number_of_participants", "number_of_participants_attended",
         "flyer", *COMPLETION_FIELDS],
        as_dict=True,
    )
    if not training or (training.docstatus or 0) >= 2:
        return False
    if training.closure_sent:
        return False
    if not all(training.get(f) for f in COMPLETION_FIELDS):
        return False

    to_emails, cc_emails = _get_closure_recipients(training)
    if not to_emails and not cc_emails:
        return False

    subject = _closure_subject(training)
    message = _post_training_email_body(training)
    frappe.sendmail(
        recipients=to_emails or cc_emails,
        cc=cc_emails or None,
        sender=_get_sender(),
        subject=subject,
        message=message,
        attachments=_get_flyer_attachments(training_name),
        expose_recipients="header",
        # Send immediately instead of waiting for the Email Queue flush, so
        # the closure mail still goes out when the site scheduler is off.
        now=True,
    )
    frappe.db.set_value("Training", training_name, "closure_sent", 1)
    frappe.db.commit()
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Email body builders
# ─────────────────────────────────────────────────────────────────────────────


def _g(t, key, default=None):
    """Read a field from a Training dict or document."""
    if isinstance(t, dict):
        return t.get(key, default)
    return getattr(t, key, default)


def _closure_subject(t):
    """Subject matches the client's closing-mail format."""
    program = (_g(t, "training_program") or "L&D Training").strip()
    branch = _branch_label(t)
    suffix = f"_{branch}" if branch else ""
    return f"Training Closer & Participants feedback {program}{suffix}"


def _ordinal_day(day):
    day = int(day)
    suffix = "th" if 10 <= day % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{day:02d}{suffix}"


def _closure_date_label(from_date, to_date):
    """'05th & 06th Oct 2026' / '05th Oct 2026' / cross-month variant."""
    if not from_date:
        return "—"
    try:
        start = getdate(from_date)
        end = getdate(to_date) if to_date else start
    except Exception:
        return _fmt_date(from_date)
    if start == end:
        return f"{_ordinal_day(start.day)} {start.strftime('%b %Y')}"
    if (start.year, start.month) == (end.year, end.month):
        return (
            f"{_ordinal_day(start.day)} & {_ordinal_day(end.day)} "
            f"{start.strftime('%b %Y')}"
        )
    return (
        f"{_ordinal_day(start.day)} {start.strftime('%b %Y')} & "
        f"{_ordinal_day(end.day)} {end.strftime('%b %Y')}"
    )


def _training_days_label(from_date, to_date):
    try:
        start = getdate(from_date)
        end = getdate(to_date) if to_date else start
        days = (end - start).days + 1
    except Exception:
        days = 1
    return f"{days}-Day" if days == 1 else f"{days}-Days"


def _branch_label(t):
    """Human branch name (Sahayog Branch.branch) for a branch code."""
    code = (_g(t, "branch") or "").strip()
    if not code:
        return ""
    try:
        return (frappe.db.get_value("Sahayog Branch", code, "branch") or code).strip()
    except Exception:
        return code


def _geo_label(value, prefix):
    if not value:
        return ""
    text = str(value).strip()
    if text.upper().startswith(prefix + "-"):
        text = text[len(prefix) + 1:]
    return text.strip()


def _region_zone_phrase(t):
    region = _geo_label(_g(t, "region"), "REGION")
    zone = _geo_label(_g(t, "zone"), "ZONE")
    if region and zone:
        return f"Region {region} of Zone {zone}"
    if zone:
        return f"Zone {zone}"
    if region:
        return f"Region {region}"
    return ""


def _attendance_summary(t):
    """Invited / attended / absent / % present from existing data only."""
    name = _g(t, "name")
    rows = []
    try:
        rows = frappe.db.get_all(
            "Training Participant",
            filters={"parent": name, "parenttype": "Training"},
            fields=["attendance_status"],
        )
    except Exception:
        rows = []

    total = len(rows)
    present = sum(
        1
        for r in rows
        if str((r.get("attendance_status") if isinstance(r, dict) else r.attendance_status) or "")
        .strip()
        .lower()
        == "present"
    )

    invited = frappe.utils.cint(_g(t, "number_of_participants"))
    attended = frappe.utils.cint(_g(t, "number_of_participants_attended"))
    # Fall back to the participant table when the headcount fields are blank.
    invited = invited or total
    attended = attended or present
    absent = max(invited - attended, 0)
    pct = min(round(attended * 100 / invited), 100) if invited else 0
    return {"invited": invited, "attended": attended, "absent": absent, "pct": pct}


def _topic_rows(t):
    """Trainer agenda / remarks -> (topic, sub-topic) rows."""
    raw = _g(t, "trainer_remarks") or ""
    rows = []
    for line in str(raw).replace("\r\n", "\n").split("\n"):
        line = line.strip().lstrip("•-*–—").strip()
        if not line:
            continue
        topic, sub = line, ""
        for sep in (" — ", " – ", " - ", ": ", " | ", ":", "|"):
            if sep in line:
                left, right = line.split(sep, 1)
                if left.strip() and right.strip():
                    topic, sub = left.strip(), right.strip()
                    break
        rows.append((topic, sub))
    return rows


def _trainer_signature(t):
    name = (_g(t, "trainer") or "").strip()
    info = {"name": name, "designation": "", "phone": ""}
    if not name:
        return info
    try:
        emp = frappe.db.get_value(
            "Employee",
            {"employee_name": name},
            ["designation", "cell_number"],
            as_dict=True,
        )
        if emp:
            info["designation"] = (emp.get("designation") or "").strip()
            info["phone"] = (emp.get("cell_number") or "").strip()
    except Exception:
        pass
    return info


def _site_relative_path(path):
    """Convert an absolute site path to the form <img embed="..."> expects."""
    site = frappe.get_site_path().rstrip(os.sep)
    rel = os.path.relpath(path, site).replace(os.sep, "/")
    if rel.startswith("public/"):
        rel = rel[len("public/"):]  # public files resolve as "files/..."
    return rel


def _flyer_inline_path(training_name):
    """Site-relative path to a raster preview of the flyer, for inline display.

    PDFs are converted with pdftoppm (first page). Returns None whenever the
    flyer is missing or cannot be rendered — the mail must never fail because
    of this.
    """
    try:
        url = frappe.db.get_value("Training", training_name, "flyer")
        if not url:
            return None
        file_name = frappe.db.get_value("File", {"file_url": url}, "name")
        if not file_name:
            return None
        file_doc = frappe.get_doc("File", file_name)
        source = file_doc.get_full_path()
        if not source or not os.path.exists(source):
            return None
        ext = os.path.splitext(source)[1].lower()
        if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp"):
            return _site_relative_path(source)
        if ext != ".pdf":
            return None
        pdftoppm = shutil.which("pdftoppm")
        if not pdftoppm:
            return None
        out_dir = frappe.get_site_path("private", "files", "ld_closure_flyers")
        os.makedirs(out_dir, exist_ok=True)
        out_base = os.path.join(out_dir, frappe.scrub(training_name))
        subprocess.run(
            [
                pdftoppm, "-f", "1", "-l", "1", "-r", "130",
                "-png", "-singlefile", source, out_base,
            ],
            check=True,
            timeout=30,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        out_png = out_base + ".png"
        return _site_relative_path(out_png) if os.path.exists(out_png) else None
    except Exception as e:
        frappe.log_error(
            f"Training flyer preview failed for {training_name}: {e}", "LD Notification"
        )
        return None


def _section(title, inner):
    if not inner:
        return ""
    return (
        f'<p style="margin:18px 0 6px;font-weight:700">{title}</p>{inner}'
    )


def _post_training_email_body(t):
    """Closing mail in the client's 'Training Closer & Participants feedback' format.

    Uses only data already present in the system. Sections with no data are
    omitted so the automatic closure mail never goes out broken.
    """
    esc = frappe.utils.escape_html
    program = esc((_g(t, "training_program") or "L&D Training").strip())
    branch = esc(_branch_label(t))
    date_label = _closure_date_label(_g(t, "from_date"), _g(t, "to_date"))
    days_label = _training_days_label(_g(t, "from_date"), _g(t, "to_date"))
    region_zone = esc(_region_zone_phrase(t))
    att = _attendance_summary(t)
    trainer = _trainer_signature(t)

    td = "padding:6px 10px;font-size:12.5px;border:1px solid #444;"
    th = (
        "padding:6px 10px;font-size:11.5px;font-weight:700;text-align:left;"
        "letter-spacing:.02em;background:#f2f2f2;border:1px solid #444;"
    )
    table = "width:100%;max-width:560px;border-collapse:collapse;margin:8px 0 4px;"

    # ── Attendance ────────────────────────────────────────────────────────
    attendance_inner = ""
    if att["invited"] > 0:
        lead = (
            f"The Program was Organized for the employees of {region_zone}. "
            if region_zone
            else ""
        )
        attendance_inner = f"""
        <p style="margin:0 0 8px">
          {lead}A total of <b>{att['invited']}</b> employees were invited, out of
          which <b>{att['attended']}</b> employees attended the program,
          resulting <b>{att['pct']} %</b> attendance rate.
        </p>
        <table style="{table}">
          <tr>
            <th style="{th}">Participants Invited</th>
            <th style="{th}">Attended</th>
            <th style="{th}">Absent</th>
            <th style="{th}">% Present</th>
          </tr>
          <tr>
            <td style="{td}text-align:center">{att['invited']}</td>
            <td style="{td}text-align:center">{att['attended']}</td>
            <td style="{td}text-align:center">{att['absent']}</td>
            <td style="{td}text-align:center">{att['pct']} %</td>
          </tr>
        </table>"""

    # ── Evaluation (checkbox status — score data isn't stored anywhere) ───
    pre = bool(_g(t, "pre_assessment_taken"))
    post = bool(_g(t, "post_assessment_taken"))
    evaluation_inner = ""
    eval_rows = ""
    if pre:
        eval_rows += f'<tr><td style="{td}">Pre-Assessment</td><td style="{td}">✅ Conducted</td></tr>'
    if post:
        eval_rows += f'<tr><td style="{td}">Post-Assessment</td><td style="{td}">✅ Conducted</td></tr>'
    if eval_rows:
        if pre and post:
            eval_para = (
                "As part of the learning evaluation process, a Pre-Assessment and "
                "a Post-Assessment were conducted for the participants."
            )
        elif pre:
            eval_para = (
                "As part of the learning evaluation process, a Pre-Assessment was "
                "conducted for the participants."
            )
        else:
            eval_para = (
                "As part of the learning evaluation process, a Post-Assessment was "
                "conducted for the participants."
            )
        evaluation_inner = f"""
        <p style="margin:0 0 8px">{eval_para}</p>
        <table style="{table}">
          <tr><th style="{th}">Activities</th><th style="{th}">Status</th></tr>
          {eval_rows}
        </table>"""

    # ── Feedback (checkbox status) ────────────────────────────────────────
    feedback_inner = ""
    if _g(t, "feedback_taken"):
        feedback_inner = f"""
        <p style="margin:0 0 8px">
          As part of the training program, participant feedback was also collected
          on parameters such as content, methodology, faculty and overall training
          experience.
        </p>
        <table style="{table}">
          <tr><th style="{th}">Activity</th><th style="{th}">Status</th></tr>
          <tr><td style="{td}">Participant Feedback</td><td style="{td}">✅ Collected</td></tr>
        </table>
        <p style="margin:8px 0 0">
          The feedback received will be used to further improve the quality and
          effectiveness of future training programs.
        </p>"""

    # ── Topics (agenda from trainer remarks) ──────────────────────────────
    topics_inner = ""
    topics = _topic_rows(t)
    if topics:
        rows = "".join(
            f'<tr><td style="{td}font-weight:600">{esc(topic)}</td>'
            f'<td style="{td}">{esc(sub or "—")}</td></tr>'
            for topic, sub in topics
        )
        topics_inner = f"""
        <table style="{table}">
          <tr><th style="{th}">Topic Covered</th><th style="{th}">Sub-Topics</th></tr>
          {rows}
        </table>"""

    # ── Training moments (flyer preview + attachment note) ────────────────
    moments_inner = ""
    flyer_img = _flyer_inline_path(_g(t, "name"))
    if flyer_img or _g(t, "flyer"):
        visual = ""
        if flyer_img:
            visual = (
                f'<p style="margin:10px 0 0"><img embed="{esc(flyer_img)}" '
                'alt="Training Moments" style="width:100%;max-width:560px;'
                'border:1px solid #ddd;border-radius:6px;display:block" /></p>'
            )
        else:
            visual = (
                '<p style="margin:8px 0 0;font-size:12.5px;color:#555">'
                "The training flyer / moments document is attached with this email.</p>"
            )
        moments_inner = f"""
        <p style="margin:0 0 8px">
          To capture the learning journey and active participation of the
          participants, we are also sharing glimpses from the training sessions.
        </p>{visual}"""

    # ── Signature ─────────────────────────────────────────────────────────
    sig_lines = [f"<b>{esc(trainer['name'] or '—')}</b>"]
    if trainer["designation"]:
        sig_lines.append(esc(trainer["designation"]))
    sig_lines.append("HR – Learning and Development")
    sig_lines.append("www.sahayogmultistate.com")
    if trainer["phone"]:
        sig_lines.append(f"Phone No: {esc(trainer['phone'])}")
    signature = "<br>".join(sig_lines)

    at_branch = f" at the <b>{branch}</b> branch" if branch else ""

    return f"""
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222;max-width:620px;margin:0 auto;line-height:1.55">
      <p style="margin:0 0 10px">Dear Sir/Madam,</p>
      <p style="margin:0 0 14px">
        We are pleased to inform you that the <b>{days_label} {program}</b>
        which was conducted from <b>{date_label}</b>{at_branch}, was successfully
        concluded.
      </p>

      {_section("Training Attendance:", attendance_inner)}
      {_section("Training Evaluation:", evaluation_inner)}
      {_section("Training Feedback:", feedback_inner)}
      {_section("Training Topic:", topics_inner)}
      {_section("📸 Training Moments &amp; Highlights:", moments_inner)}

      <p style="margin:22px 0 0">Regards,</p>
      <p style="margin:4px 0 0">{signature}</p>

      <p style="margin:22px 0 0;font-size:11.5px;color:#777">
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

def _training_branches(training):
    """Branch codes of a training: legacy field + Geographies rows."""
    codes = set()
    if isinstance(training, dict):
        if training.get("branch"):
            codes.add(training["branch"])
        for g in training.get("geographies") or []:
            if isinstance(g, dict):
                if g.get("branch"):
                    codes.add(g["branch"])
            elif g:
                codes.add(g)
    else:
        if getattr(training, "branch", None):
            codes.add(training.branch)
        try:
            geos = frappe.db.get_all(
                "Training Geography",
                filters={"parent": training.name},
                pluck="branch",
            )
            for code in geos or []:
                if code:
                    codes.add(code)
        except Exception:
            pass
    return sorted(codes)


def _get_branch_head_emails(training):
    """Branch-head emails from Sahayog Branch.email, matched on the
    training's branches. Returns [(branch_code, email)]. Invalid/blank
    entries (e.g. '#N/A') are skipped."""
    out = []
    for code in _training_branches(training):
        email = (frappe.db.get_value("Sahayog Branch", code, "email") or "").strip()
        if email and "@" in email:
            out.append((code, email))
    return out


def _get_invitation_emails(training):
    """(To, CC) emails for the training invitation.

    To: Employee-type participants + branch heads (Sahayog Branch.email)
        + Training.additional_to (comma-separated).
    CC: trainer + Training.additional_cc (comma-separated).
    Agent-type participants have no email in the system — skipped.
    Fallback: when no To email exists, trainer moves to To
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

    for _code, head_email in _get_branch_head_emails(training):
        to_emails.add(head_email)

    raw_to = training.get("additional_to") if isinstance(training, dict) else getattr(training, "additional_to", "")
    to_emails.update(_parse_cc(raw_to))

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
    """(To, CC) for the closure mail — same split as invitation for now.

    To: participants + branch heads + additional_to; CC: trainer + additional_cc.
    Branch-manager recipients are parked below (commented) for later use.
    """
    to_emails, cc_emails = _get_invitation_emails(training)

    # --- Parked for later: branch managers (heads) of the training's branches.
    # Branch Manager = active Employee posted at the branch (sol_id) with a
    # manager designation — same rule as Agent.get_branch_managers.
    # branch_codes = set()
    # if training.branch:
    #     branch_codes.add(training.branch)
    # try:
    #     geos = frappe.db.get_all(
    #         "Training Geography",
    #         filters={"parent": training.name},
    #         pluck="branch",
    #     )
    #     for code in geos or []:
    #         if code:
    #             branch_codes.add(code)
    # except Exception:
    #     pass
    # if branch_codes:
    #     rows = frappe.db.get_all(
    #         "Employee",
    #         filters={
    #             "sol_id": ["in", sorted(branch_codes)],
    #             "status": "Active",
    #             "designation": ["in", ["BRANCH MANAGER", "Asst. Branch Manager", "Branch Operation Manager"]],
    #         },
    #         fields=["company_email", "personal_email"],
    #     )
    #     for emp in rows:
    #         email = emp.company_email or emp.personal_email
    #         if email:
    #             cc_emails.append(email) if email not in cc_emails else None

    return to_emails, cc_emails
