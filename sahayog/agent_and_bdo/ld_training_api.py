# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt
#
# L&D Training Calendar — Backend API (Frontend: sahayog/www/training.html)
# Operates on the dedicated `Training` doctype (Meeting is NOT used here).

import calendar
import re

import frappe
from frappe import _

from sahayog.agent_and_bdo.doctype.training.training import (
    COMPLETION_FIELDS,
    get_training_status,
)

ADMIN_ROLES = {"L&D Admin", "System Manager", "Administrator"}
TRAINER_ROLES = {"Trainer", "Trainer Head"}

# Event payload fields expected by the calendar frontend
CALENDAR_FIELDS = [
    "name", "training_program", "from_date", "to_date", "start_time", "end_time",
    "trainer", "training_location", "training_type", "zone", "region", "district", "branch",
    "is_adhoc", "docstatus", "status", "trainer_remarks", "number_of_participants",
    "program_duration_hours",
    "training_delivered", "attendance_marked",
    "pre_assessment_taken", "post_assessment_taken", "feedback_taken",
]
# Budget fields are read from the DB but only exposed to L&D Admin / System Manager
BUDGET_FIELDS = ["budget_amount", "actual_expense"]


def _get_geographies_map(training_names):
    """Return {training_name: [ {branch, zone, region, district}, ... ] }."""
    if not training_names:
        return {}
    placeholders = ", ".join(["%s"] * len(training_names))
    rows = frappe.db.sql(
        f"SELECT parent, branch, zone, region, district "
        f"FROM `tabTraining Geography` WHERE parent IN ({placeholders}) ORDER BY idx ASC",
        training_names,
        as_dict=True,
    )
    out = {name: [] for name in training_names}
    for r in rows:
        out[r.parent].append({
            "branch": r.branch or "",
            "zone": r.zone or "",
            "region": r.region or "",
            "district": r.district or "",
        })
    return out


def _geography_matches(geos, zone=None, region=None, district=None, branch=None):
    if not zone and not region and not district and not branch:
        return True
    if geos:
        for g in geos:
            if zone and g.get("zone") != zone:
                continue
            if region and g.get("region") != region:
                continue
            if district and g.get("district") != district:
                continue
            if branch and g.get("branch") != branch:
                continue
            return True
        return False
    return True


def _geo_sql(col, val, param_key, params):
    params[param_key] = val
    return (
        f"(t.{col} = %({param_key})s OR EXISTS "
        f"(SELECT 1 FROM `tabTraining Geography` tg "
        f"WHERE tg.parent = t.name AND tg.{col} = %({param_key})s))"
    )


def _is_admin():
    return bool(ADMIN_ROLES & set(frappe.get_roles(frappe.session.user)))


def _is_trainer():
    return bool(TRAINER_ROLES & set(frappe.get_roles(frappe.session.user)))


def _my_trainer_name():
    """Employee name linked to the current user (trainer identity for scoping)."""
    return frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "employee_name")


def _owner_scope():
    """Non-admin trainers only see own trainings: created by them OR assigned to them."""
    if _is_admin() or not _is_trainer():
        return {}
    scope = {"owner": frappe.session.user}
    trainer_name = _my_trainer_name()
    if trainer_name:
        scope["trainer"] = trainer_name
    return scope


def _owner_scope_sql(params, prefix="scope"):
    """SQL equivalent of _owner_scope() for raw-SQL reports.

    Returns a condition string ("" for admins). Non-admin non-trainers are
    rejected by callers before reaching here.
    """
    scope = _owner_scope()
    if not scope:
        return ""
    parts = []
    if scope.get("owner"):
        params[prefix + "_owner"] = scope["owner"]
        parts.append(f"t.owner = %({prefix}_owner)s")
    if scope.get("trainer"):
        params[prefix + "_trainer"] = scope["trainer"]
        parts.append(f"t.trainer = %({prefix}_trainer)s")
    return "(" + " OR ".join(parts) + ")"


def _safe_year_month(year, month):
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


def _format_time(t):
    if not t:
        return ""
    try:
        return frappe.utils.get_time(t).strftime("%I:%M %p")
    except Exception:
        return str(t) if t else ""


def _normalize_time(t):
    """Accept '9:30 AM' / '14:00' and return a 24h HH:MM:SS value for the Time field."""
    if not t:
        return None
    t = str(t).strip()
    if ":" not in t:
        return None
    m = re.match(r"^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*([AaPp][Mm])?$", t)
    if not m:
        return t
    h, mi, sec, ap = int(m.group(1)), int(m.group(2) or 0), int(m.group(3) or 0), (m.group(4) or "").upper()
    if ap == "PM" and h < 12:
        h += 12
    if ap == "AM" and h == 12:
        h = 0
    if h > 23 or mi > 59 or sec > 59:
        return t
    return f"{h:02d}:{mi:02d}:{sec:02d}"


@frappe.whitelist()
def get_user_role_info():
    """Current user's L&D role context + linked Employee geo (for filtered views)."""
    roles = frappe.get_roles(frappe.session.user)
    employee = frappe.db.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        ["name", "employee_name", "custom_zone", "custom_region", "custom_district", "sahayog_branch"],
        as_dict=True,
    )
    team_ids = _my_team_ids()
    user_roles = set(roles)
    return {
        "user": frappe.session.user,
        "is_ld_admin": _is_admin(),
        "is_ld_trainer": _is_trainer(),
        "is_ld_viewer": "L&D Viewer" in roles,
        "employee": employee or {},
        "roles": roles,
        "has_team": bool(team_ids),
        "team_count": len(team_ids),
        # Team Training tab: reportees + an L&D role (so no other team's
        # data is ever visible; grant via the existing L&D Viewer role).
        "can_see_team": bool(team_ids) and bool(
            user_roles & (ADMIN_ROLES | TRAINER_ROLES | {"L&D Viewer"})
        ),
    }


def _my_employee_id():
    """Employee id linked to the current user (None if not linked)."""
    return frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")


def _my_team_ids():
    """Active reportees (Employee ids) of the current user. [] when not a team leader."""
    me = _my_employee_id()
    if not me:
        return []
    return frappe.db.get_all(
        "Employee",
        filters={"reports_to": me, "status": "Active"},
        pluck="name",
    ) or []


def _require_team_access():
    """Team Training APIs: reportees + an L&D role (Viewer/Admin/Trainer).

    Role grants eligibility, reportees scope the data — other teams' data
    is never visible. Grant access via the existing L&D Viewer role.
    """
    team_ids = _my_team_ids()
    if not team_ids:
        frappe.throw(_("Team training view is available only for team leaders."))
    user_roles = set(frappe.get_roles(frappe.session.user))
    if not (user_roles & (ADMIN_ROLES | TRAINER_ROLES | {"L&D Viewer"})):
        frappe.throw(_("You don't have permission to view team trainings. Ask your admin for the L&D Viewer role."))
    return team_ids


@frappe.whitelist()
def get_holidays(year, month):
    # Holidays for current user (Sundays + Employee.holiday_list) for a month.
    # Mirrors team_attendance._get_employee_holiday_dates logic.
    year, month = _safe_year_month(year, month)
    last_day = calendar.monthrange(year, month)[1]
    holidays = {}
    for day in range(1, last_day + 1):
        d = frappe.utils.getdate(f"{year}-{month:02d}-{day:02d}")
        if d.weekday() == 6:
            holidays[str(d)] = "Sunday"
    # Fetch Employee.holiday_list (as in sahayog/api/attendance.py)
    emp = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, ["holiday_list", "company"], as_dict=True)
    holiday_list = None
    if emp:
        holiday_list = emp.holiday_list
        if not holiday_list and emp.company:
            holiday_list = frappe.db.get_value("Company", emp.company, "default_holiday_list")
    if not holiday_list:
        # Fallback: try user's branch state -> Holiday List "{State} - {year}"
        try:
            emp_branch = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "sahayog_branch")
            if emp_branch:
                state = frappe.db.get_value("Sahayog Branch", emp_branch, "state")
                if state:
                    cand = f"{state} - {year}"
                    if frappe.db.exists("Holiday List", cand):
                        holiday_list = cand
                    else:
                        holiday_list = frappe.db.get_value("Holiday List", {"holiday_list_name": ["like", f"{state} - %"]}, "name")
        except Exception:
            pass
    if holiday_list:
        rows = frappe.db.sql(
            "SELECT holiday_date, description FROM `tabHoliday` WHERE parent=%(hl)s AND holiday_date BETWEEN %(start)s AND %(end)s",
            {"hl": holiday_list, "start": f"{year}-{month:02d}-01", "end": f"{year}-{month:02d}-{last_day:02d}"},
            as_dict=True,
        )
        for r in rows:
            d_str = str(r.holiday_date)[:10]
            # If already Sunday, overwrite with holiday description (more informative)
            holidays[d_str] = (r.description or "Holiday").strip() if r.description else "Holiday"
    return holidays


# ─────────────────────────────────────────────────────────────────────────────
# Calendar data
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_calendar_data(year, month, zone=None, region=None, district=None, branch=None):
    """Trainings for a given month with status info, shaped for the calendar."""
    year, month = _safe_year_month(year, month)
    last_day = calendar.monthrange(year, month)[1]

    filters = {
        "docstatus": ["<", 2],
        # Any training whose date range overlaps the requested month
        "from_date": ["<=", f"{year}-{month:02d}-{last_day}"],
    }
    scope_or_filters = _owner_scope()

    rows = frappe.db.get_all(
        "Training",
        filters=filters,
        or_filters=scope_or_filters,
        fields=CALENDAR_FIELDS + BUDGET_FIELDS,
        order_by="from_date asc, start_time asc",
    )
    month_start = f"{year}-{month:02d}-01"
    # Keep only trainings that reach into (or end within) this month.
    # Missing to_date falls back to from_date (single-day).
    rows = [r for r in rows if str(r.to_date or r.from_date or "")[:10] >= month_start]

    # Enrich with geographies for post-filtering (supports multi-branch)
    geo_map = _get_geographies_map([r.name for r in rows])
    has_geo_filter = any([zone, region, district, branch])
    if has_geo_filter:
        filtered = []
        for r in rows:
            geos = geo_map.get(r.name, [])
            if geos:
                if not _geography_matches(geos, zone, region, district, branch):
                    continue
            else:
                if zone and r.zone != zone:
                    continue
                if region and r.region != region:
                    continue
                if district and r.district != district:
                    continue
                if branch and r.branch != branch:
                    continue
            filtered.append(r)
        rows = filtered

    participants = _participant_counts([r.name for r in rows])
    show_budget = True

    out = []
    for r in rows:
        from_date = str(r.from_date or "")[:10]
        to_date = str(r.to_date or r.from_date or "")[:10]
        geos = geo_map.get(r.name, [])
        branches = [g["branch"] for g in geos if g["branch"]] if geos else ([r.branch] if r.branch else [])
        out.append({
            "name": r.name,
            "date": from_date,
            "from_date": from_date,
            "to_date": to_date,
            "time": _format_time(r.start_time),
            "start_time": _format_time(r.start_time),
            "end_time": _format_time(r.end_time),
            "training_program": r.training_program or "",
            "trainer": r.trainer,
            "trainer_name": r.trainer or "",
            "training_location": r.training_location or "",
            "training_type": r.training_type or "",
            "zone": r.zone or "",
            "region": r.region or "",
            "district": r.district or "",
            "branch": r.branch or "",
            "geographies": geos,
            "branches": branches,
            "participants": participants.get(r.name, 0),
            "number_of_participants": r.number_of_participants or 0,
            "program_duration_hours": r.program_duration_hours or 0,
            "is_adhoc": r.is_adhoc or 0,
            "docstatus": r.docstatus,
            "status": r.status or get_training_status(r),
            "training_delivered": r.training_delivered or 0,
            "attendance_marked": r.attendance_marked or 0,
            "pre_assessment_taken": r.pre_assessment_taken or 0,
            "post_assessment_taken": r.post_assessment_taken or 0,
            "feedback_taken": r.feedback_taken or 0,
            "trainer_remarks": r.trainer_remarks or "",
            "budget_amount": (r.budget_amount if show_budget else None),
            "actual_expense": (r.actual_expense if show_budget else None),
        })
    return out


@frappe.whitelist()
def get_training_list(
    status=None,
    zone=None,
    region=None,
    district=None,
    branch=None,
    from_date=None,
    to_date=None,
    search=None,
    is_adhoc=None,
    limit=500,
):
    """Flat, filterable list of training records for the Trainings tab."""
    filters = {"docstatus": ["<", 2]}
    scope_or_filters = _owner_scope()
    if from_date:
        filters["from_date"] = [">=", from_date]
    if to_date:
        filters["to_date"] = ["<=", to_date]
    if is_adhoc in ("1", "0"):
        filters["is_adhoc"] = int(is_adhoc)
    if search:
        filters["training_program"] = ["like", f"%{search}%"]

    rows = frappe.db.get_all(
        "Training",
        filters=filters,
        or_filters=scope_or_filters,
        fields=CALENDAR_FIELDS + BUDGET_FIELDS,
        order_by="from_date desc, start_time desc",
        limit_page_length=limit,
    )
    has_geo_filter = any([zone, region, district, branch])
    if has_geo_filter:
        geo_map = _get_geographies_map([r.name for r in rows])
        filtered = []
        for r in rows:
            geos = geo_map.get(r.name, [])
            if geos:
                if not _geography_matches(geos, zone, region, district, branch):
                    continue
            else:
                if zone and r.zone != zone:
                    continue
                if region and r.region != region:
                    continue
                if district and r.district != district:
                    continue
                if branch and r.branch != branch:
                    continue
            filtered.append(r)
        rows = filtered
    else:
        geo_map = _get_geographies_map([r.name for r in rows])

    participants = _participant_counts([r.name for r in rows])
    show_budget = True
    req_status = (status or "").strip().lower().replace(" ", "") or None

    out = []
    for r in rows:
        st = (r.status or get_training_status(r) or "").strip().lower().replace(" ", "")
        if req_status and st != req_status:
            continue
        from_date_v = str(r.from_date or "")[:10]
        to_date_v = str(r.to_date or r.from_date or "")[:10]
        geos = geo_map.get(r.name, [])
        branches = [g["branch"] for g in geos if g["branch"]] if geos else ([r.branch] if r.branch else [])
        out.append({
            "name": r.name,
            "from_date": from_date_v,
            "to_date": to_date_v,
            "time": _format_time(r.start_time),
            "end_time": _format_time(r.end_time),
            "training_program": r.training_program or "",
            "trainer": r.trainer or "",
            "trainer_name": r.trainer or "",
            "training_location": r.training_location or "",
            "training_type": r.training_type or "",
            "zone": r.zone or "",
            "region": r.region or "",
            "district": r.district or "",
            "branch": r.branch or "",
            "geographies": geos,
            "branches": branches,
            "participants": participants.get(r.name, 0),
            "number_of_participants": r.number_of_participants or 0,
            "program_duration_hours": r.program_duration_hours or 0,
            "is_adhoc": r.is_adhoc or 0,
            "docstatus": r.docstatus,
            "status": st,
            "training_delivered": r.training_delivered or 0,
            "attendance_marked": r.attendance_marked or 0,
            "pre_assessment_taken": r.pre_assessment_taken or 0,
            "post_assessment_taken": r.post_assessment_taken or 0,
            "feedback_taken": r.feedback_taken or 0,
            "trainer_remarks": r.trainer_remarks or "",
            "budget_amount": (r.budget_amount if show_budget else None),
            "actual_expense": (r.actual_expense if show_budget else None),
        })
    return out


@frappe.whitelist()
def get_training_details(name):
    """Single training record (drawer view)."""
    if not _is_admin() and _is_trainer():
        info = frappe.db.get_value("Training", name, ["owner", "trainer"], as_dict=True) or {}
        is_own = info.owner == frappe.session.user or (
            info.trainer and info.trainer == _my_trainer_name()
        )
        if not is_own:
            frappe.throw(_("You don't have permission to view this training."))
    doc = frappe.get_doc("Training", name)
    r = doc.as_dict()
    r["date"] = str(doc.from_date or "")[:10]
    r["from_date"] = str(doc.from_date or "")[:10]
    r["to_date"] = str(doc.to_date or doc.from_date or "")[:10]
    r["time"] = _format_time(doc.start_time)
    geos = []
    for g in (doc.get("geographies") or []):
        geos.append({
            "branch": g.branch or "",
            "zone": g.zone or "",
            "region": g.region or "",
            "district": g.district or "",
        })
    r["geographies"] = geos
    r["branches"] = [g["branch"] for g in geos if g["branch"]]
    participants_list = frappe.db.get_all(
        "Training Participant",
        filters={"parent": name},
        fields=["name", "reference_doctype", "agent_employee", "full_name", "attendance_status"],
        order_by="idx asc",
    )
    r["participant_list"] = participants_list
    r["participants"] = len(participants_list)
    # Budget visible to all roles (writes stay L&D Admin-only).
    return r


def _participant_counts(names):
    if not names:
        return {}
    placeholders = ", ".join(["%s"] * len(names))
    counts = {}
    for parent, count in frappe.db.sql(
        f"select parent, count(*) from `tabTraining Participant` "
        f"where parent in ({placeholders}) group by parent",
        names,
    ):
        counts[parent] = count
    return counts


# ─────────────────────────────────────────────────────────────────────────────
# Status overview (summary counts)
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_status_overview(year, month, zone=None, region=None, district=None, branch=None):
    """Counts by calendar status for the month (matches get_training_status)."""
    year, month = _safe_year_month(year, month)
    last_day = calendar.monthrange(year, month)[1]

    filters = {
        "docstatus": ["<", 2],
        "from_date": ["<=", f"{year}-{month:02d}-{last_day}"],
    }
    scope_or_filters = _owner_scope()

    rows = frappe.db.get_all(
        "Training", filters=filters, or_filters=scope_or_filters, fields=["name", "from_date", "to_date", "docstatus", "status", *COMPLETION_FIELDS, "zone", "region", "district", "branch"]
    )
    month_start = f"{year}-{month:02d}-01"
    rows = [r for r in rows if str(r.to_date or r.from_date or "")[:10] >= month_start]

    has_geo_filter = any([zone, region, district, branch])
    if has_geo_filter:
        geo_map = _get_geographies_map([r.name for r in rows])
        filtered = []
        for r in rows:
            geos = geo_map.get(r.name, [])
            if geos:
                if not _geography_matches(geos, zone, region, district, branch):
                    continue
            else:
                if zone and r.zone != zone:
                    continue
                if region and r.region != region:
                    continue
                if district and r.district != district:
                    continue
                if branch and r.branch != branch:
                    continue
            filtered.append(r)
        rows = filtered

    counts = {"draft": 0, "upcoming": 0, "inprogress": 0, "completed": 0, "pending": 0}
    for r in rows:
        st = r.status or get_training_status(r)
        key = st.lower()
        if st == "In Progress":
            key = "inprogress"
        counts[key] = counts.get(key, 0) + 1

    counts["total"] = len(rows)
    return counts


# ─────────────────────────────────────────────────────────────────────────────
# Create / update (schedule -> conduct -> completed)
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def create_training(**kwargs):
    """
    Schedule a training (L&D Admin / Trainer).
    Plain form, no submit workflow: the record is usable right after insert.

    Geography: accepts either single legacy fields (branch/zone/region/district)
    or new `geographies` param (JSON list of {branch} or branch codes). When
    geographies is provided, each branch's zone/region/district is auto-filled.
    """
    _require_can_write()

    allowed = {
        "training_program", "is_adhoc", "from_date", "to_date", "start_time", "end_time",
        "trainer", "training_location", "training_type", "zone", "region", "district", "branch",
        "trainer_remarks", "training_delivered", "attendance_marked",
        "pre_assessment_taken", "post_assessment_taken", "feedback_taken",
        "number_of_participants",
    }
    doc = frappe.new_doc("Training")
    participants = frappe.parse_json(kwargs.get("participants") or "[]")
    geographies = frappe.parse_json(kwargs.get("geographies") or "[]")
    for field in allowed:
        if kwargs.get(field) not in (None, ""):
            doc.set(field, kwargs[field])
    if doc.get("number_of_participants") not in (None, ""):
        try:
            doc.number_of_participants = int(doc.number_of_participants)
        except (TypeError, ValueError):
            frappe.throw(_("Number of Participants must be a whole number."))
        if doc.number_of_participants < 0:
            frappe.throw(_("Number of Participants cannot be negative."))
    if doc.start_time:
        doc.start_time = _normalize_time(doc.start_time)
    if doc.end_time:
        doc.end_time = _normalize_time(doc.end_time)
    # If start/end time not provided, keep blank (empty string) so DB stores NULL not auto-now
    if not kwargs.get("start_time"):
        doc.start_time = ""
    if not kwargs.get("end_time"):
        doc.end_time = ""
    # Single-day training: to_date defaults to from_date
    if not doc.to_date and doc.from_date:
        doc.to_date = doc.from_date

    seen_branches = set()
    for geo in geographies:
        branch_val = None
        if isinstance(geo, dict):
            branch_val = geo.get("branch") or geo.get("name")
        elif isinstance(geo, str):
            branch_val = geo
        if not branch_val or branch_val in seen_branches:
            continue
        seen_branches.add(branch_val)
        geo_info = frappe.db.get_value(
            "Sahayog Branch", branch_val, ["zone", "region", "district"], as_dict=True
        ) or {}
        doc.append("geographies", {
            "branch": branch_val,
            "zone": geo_info.get("zone") or (geo.get("zone") if isinstance(geo, dict) else "") or "",
            "region": geo_info.get("region") or (geo.get("region") if isinstance(geo, dict) else "") or "",
            "district": geo_info.get("district") or (geo.get("district") if isinstance(geo, dict) else "") or "",
        })

    if doc.get("geographies"):
        first = doc.geographies[0]
        doc.branch = first.branch
        doc.zone = first.zone
        doc.region = first.region
        doc.district = first.district

    for p in participants:
        if isinstance(p, str):
            # Legacy: plain employee id string
            doc.append("participants", {
                "reference_doctype": "Employee",
                "agent_employee": p,
            })
        elif isinstance(p, dict):
            ref_type = p.get("reference_doctype") or "Employee"
            ref_id = p.get("agent_employee") or p.get("employee") or p.get("name")
            full_name = p.get("full_name") or p.get("employee_name") or ""
            if ref_id:
                doc.append("participants", {
                    "reference_doctype": ref_type,
                    "agent_employee": ref_id,
                    "full_name": full_name,
                })

    doc.insert()
    return get_training_details(doc.name)


@frappe.whitelist()
def update_training_status(training_name, field, value):
    """
    Trainer updates a completion checkpoint after conducting the training.
    Allowed: the 5 completion fields or trainer_remarks.
    """
    if field not in (*COMPLETION_FIELDS, "trainer_remarks"):
        frappe.throw(_("Field '{0}' is not allowed for status update.").format(field))

    doc = frappe.get_doc("Training", training_name)
    _ensure_can_update(doc)

    if field == "trainer_remarks":
        frappe.db.set_value("Training", training_name, "trainer_remarks", value)
    else:
        frappe.db.set_value("Training", training_name, field, int(bool(value)))

    # Recompute derived status
    doc.reload()
    status = get_training_status(doc)
    frappe.db.set_value("Training", training_name, "status", status)
    frappe.db.commit()
    return {"success": True, "status": status}


@frappe.whitelist()
def update_participant_attendance(training_name, participant_name, attendance_status):
    """
    Mark a single participant Present/Absent. Reuses the existing
    Training Participant `attendance_status` field (no new field) and the
    existing `_ensure_can_update` permission check.

    `participant_name` is the child-table row name scoped to this Training,
    so a row from another Training can never be updated through here.
    Returns the updated attendance summary.
    """
    if attendance_status not in ("Present", "Absent"):
        frappe.throw(_("Attendance status must be Present or Absent."))

    doc = frappe.get_doc("Training", training_name)
    _ensure_can_update(doc)

    row = next((p for p in (doc.participants or []) if p.name == participant_name), None)
    if not row:
        frappe.throw(_("Participant not found in this training."))
    if (row.reference_doctype or "Employee") != "Agent":
        frappe.throw(_("Attendance marking is only applicable for Agents."))

    # Direct set_value: avoids re-running full doc validations (e.g. the
    # Sunday/holiday schedule check) for an attendance-only change.
    frappe.db.set_value("Training Participant", row.name, "attendance_status", attendance_status)
    frappe.db.commit()
    return {"success": True, "summary": _attendance_summary(training_name)}


def _attendance_summary(training_name):
    """{total, present, absent, unmarked} for a training's participants."""
    rows = frappe.db.get_all(
        "Training Participant",
        filters={"parent": training_name, "parenttype": "Training"},
        fields=["attendance_status"],
    )
    summary = {"total": len(rows), "present": 0, "absent": 0, "unmarked": 0}
    for r in rows:
        if r.attendance_status == "Present":
            summary["present"] += 1
        elif r.attendance_status == "Absent":
            summary["absent"] += 1
        else:
            summary["unmarked"] += 1
    return summary


@frappe.whitelist()
def sync_participants(training_name, participants=None):
    """Add/remove participants on a training (no locks).

    `participants`: JSON list of {reference_doctype, agent_employee}.
    Sent as the full current list: missing pairs are appended, pairs absent
    from the list are removed. Kept rows (incl. attendance) are untouched.
    """
    doc = frappe.get_doc("Training", training_name)
    _ensure_can_update(doc)

    wanted = frappe.parse_json(participants or "[]") or []
    seen = []
    seen_set = set()
    types = set()
    for p in wanted:
        ref_type = (p.get("reference_doctype") or "Employee") if isinstance(p, dict) else "Employee"
        ref_id = (p.get("agent_employee") or p.get("employee") or "") if isinstance(p, dict) else ""
        if ref_id and (ref_type, ref_id) not in seen_set:
            seen_set.add((ref_type, ref_id))
            seen.append((ref_type, ref_id))
            types.add(ref_type)

    if len(types) > 1:
        frappe.throw(_("A training cannot have mixed participants. Please select either Employees or Agents only."))

    existing_rows = frappe.db.get_all(
        "Training Participant",
        filters={"parent": training_name, "parenttype": "Training"},
        fields=["name", "reference_doctype", "agent_employee", "idx"],
        order_by="idx asc",
    )
    existing_map = {((r.reference_doctype or "Employee"), r.agent_employee): r for r in existing_rows}

    # Append newly added participants
    max_idx = max([r.idx for r in existing_rows] or [0])
    for ref_type, ref_id in seen:
        if (ref_type, ref_id) in existing_map:
            continue
        max_idx += 1
        full_name = frappe.db.get_value(
            "Agent" if ref_type == "Agent" else "Employee",
            ref_id,
            "agent_name" if ref_type == "Agent" else "employee_name",
        ) or ref_id
        frappe.get_doc({
            "doctype": "Training Participant",
            "parent": training_name,
            "parenttype": "Training",
            "parentfield": "participants",
            "idx": max_idx,
            "reference_doctype": ref_type,
            "agent_employee": ref_id,
            "full_name": full_name,
        }).insert(ignore_permissions=True)

    # Delete participants removed in the UI
    for (ref_type, ref_id), row in existing_map.items():
        if (ref_type, ref_id) not in seen_set:
            frappe.db.delete("Training Participant", row.name)

    frappe.db.commit()
    return {"success": True, "summary": _attendance_summary(training_name)}


@frappe.whitelist()
def update_budget(training_name, budget_amount=None, actual_expense=None):
    """Budget/expense capture — L&D Admin, plus the assigned trainer (owner or
    trainer match) after all 5 completion checks are ticked."""
    if _is_admin():
        pass
    else:
        _doc = frappe.get_doc("Training", training_name)
        _ensure_can_update(_doc)
        _require_completed(_doc)
    if budget_amount is None and actual_expense is None:
        # Nothing to change (DB columns are NOT NULL) — don't touch stored values
        return {"success": True}
    frappe.db.set_value("Training", training_name, "budget_amount", budget_amount)
    frappe.db.set_value("Training", training_name, "actual_expense", actual_expense)
    frappe.db.commit()
    return {"success": True}


# ─────────────────────────────────────────────────────────────────────────────
# Geography filters
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_geo_options():
    """Distinct Zone / Region / District values sourced from Sahayog Branch."""
    rows = frappe.db.sql(
        """
        select distinct zone, region, district
        from `tabSahayog Branch`
        where (zone is not null and zone != '')
           or (region is not null and region != '')
           or (district is not null and district != '')
        """,
        as_dict=True,
    )
    zones, regions, districts = set(), set(), set()
    for r in rows:
        if r.zone: zones.add(r.zone)
        if r.region: regions.add(r.region)
        if r.district: districts.add(r.district)

    branches = frappe.db.get_all(
        "Sahayog Branch", filters={"disabled": ["!=", 1]}, pluck="name"
    ) if frappe.db.has_column("Sahayog Branch", "disabled") else frappe.db.get_all(
        "Sahayog Branch", pluck="name"
    )

    return {
        "zones": sorted(z for z in zones if z),
        "regions": sorted(r for r in regions if r),
        "districts": sorted(d for d in districts if d),
        "branches": sorted(branches or []),
    }


@frappe.whitelist()
def get_branch_options():
    """Branches for the Add Training picker: name (code) + display name, sorted."""
    filters = (
        {"disabled": ["!=", 1]}
        if frappe.db.has_column("Sahayog Branch", "disabled")
        else None
    )
    return frappe.db.get_all(
        "Sahayog Branch",
        fields=["name", "branch", "district", "region", "zone"],
        filters=filters,
        order_by="name asc",
        limit_page_length=0,
    )


# ─────────────────────────────────────────────────────────────────────────────
# MIS monthly report (L&D Admin)
# Column layout follows the Excel sheet shared by the MIS team.
# ─────────────────────────────────────────────────────────────────────────────

MIS_REPORT_COLUMNS = [
    {"key": "s_no", "label": "S.No"},
    {"key": "emp_id", "label": "Emp ID"},
    {"key": "name", "label": "Name"},
    {"key": "department", "label": "Department"},
    {"key": "division", "label": "Division"},
    {"key": "designation", "label": "Designation"},
    {"key": "date_of_joining", "label": "Date of Joining"},
    {"key": "manager_id", "label": "Manager ID"},
    {"key": "manager_name", "label": "Manager Name"},
    {"key": "branch_name", "label": "Branch Name"},
    {"key": "state", "label": "State"},
    {"key": "zone", "label": "Zone"},
    {"key": "training_start_date", "label": "Training Start Date"},
    {"key": "training_end_date", "label": "Training End date"},
    {"key": "program_name", "label": "Program Name"},
    # NOTE (client format, no data source yet — re-enable when tracked):
    # {"key": "program_sub_type", "label": "Program Sub type"},
    {"key": "training_type", "label": "Training Type"},
    {"key": "no_of_days", "label": "No of Day"},
    {"key": "duration_hours", "label": "Training duration (Hours)"},
    # NOTE (needs per-day attendance tracking):
    # {"key": "day_1", "label": "Day-1"},
    # {"key": "day_2", "label": "Day-2"},
    # {"key": "day_3", "label": "Day-3"},
    # {"key": "day_4", "label": "Day-4"},
    # {"key": "day_5", "label": "Day-5"},
    # {"key": "day_6", "label": "Day -6"},
    {"key": "total_present", "label": "Total Present"},
    {"key": "attendance_pct", "label": "Attendance  %"},
    # NOTE (needs scores/certification tracking):
    # {"key": "attendance_pct", "label": "Attendance  %"},
    # {"key": "pre_test_score", "label": "Pre Test score"},
    # {"key": "post_test_score", "label": "Post Test Score"},
    # {"key": "total_score", "label": "Total Score"},
    # {"key": "passing_pct", "label": "Passing  %"},
    # {"key": "certification_status", "label": "Certification status"},
    {"key": "trainer_name", "label": "Trainer Name"},
    {"key": "trainer_id", "label": "Trainer ID"},
    {"key": "employee_status", "label": "Employee status"},
    {"key": "remarks", "label": "Remarks"},
]


def _training_hours(start_time, end_time, no_of_days):
    """Total training hours = daily (end-start) x days. '' when times missing."""
    try:
        if not start_time or not end_time:
            return ""
        s = frappe.utils.get_time(start_time)
        e = frappe.utils.get_time(end_time)
        secs = (e.hour * 3600 + e.minute * 60 + e.second) - (s.hour * 3600 + s.minute * 60 + s.second)
        if secs <= 0:
            return ""
        total = round(secs / 3600 * (no_of_days or 1), 1)
        return int(total) if float(total).is_integer() else total
    except Exception:
        return ""


def _employee_columns():
    try:
        return {r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`")}
    except Exception:
        return set()


def _employee_master(emp_ids):
    """name -> employee row (incl. optional custom fields) for a set of employee ids."""
    if not emp_ids:
        return {}
    emp_cols = _employee_columns()
    fields = ["name", "employee_name", "department", "designation",
              "date_of_joining", "reports_to", "branch", "status"]
    for extra in ("custom_division", "custom_zone", "sahayog_branch"):
        if extra in emp_cols:
            fields.append(extra)
    out = {}
    for e in frappe.db.get_all(
        "Employee",
        filters={"name": ["in", list(emp_ids)]},
        fields=fields,
        limit_page_length=0,
    ):
        out[e.name] = e
    return out


def _manager_names(emp_rows):
    """reports_to employee id -> manager name."""
    mgr_ids = {e.reports_to for e in emp_rows.values() if e.reports_to}
    out = {}
    if not mgr_ids:
        return out
    for m in frappe.db.get_all(
        "Employee",
        filters={"name": ["in", list(mgr_ids)]},
        fields=["name", "employee_name"],
        limit_page_length=0,
    ):
        out[m.name] = m.employee_name or m.name
    return out


def _branch_meta(branch_ids):
    """Sahayog Branch name (code) -> {name, branch (display), state}."""
    if not branch_ids:
        return {}
    out = {}
    for b in frappe.db.get_all(
        "Sahayog Branch",
        filters={"name": ["in", list(branch_ids)]},
        fields=["name", "branch", "state"],
        limit_page_length=0,
    ):
        out[b.name] = b
    return out


def _trainer_ids(trainings):
    """trainer field stores employee_name; reverse lookup to Employee id."""
    trainer_names = {t.trainer for t in trainings if t.trainer}
    out = {}
    if not trainer_names:
        return out
    for tr in frappe.db.get_all(
        "Employee",
        filters={"employee_name": ["in", list(trainer_names)]},
        fields=["employee_name", "name"],
        limit_page_length=0,
    ):
        out[tr.employee_name] = tr.name
    return out


@frappe.whitelist()
def get_mis_report(
    month,
    zone=None,
    region=None,
    district=None,
    branch=None,
    page=None,
    page_size=None,
):
    """Participant-level monthly report matching the MIS Excel format.

    One row per training participant (plus trainings with no participants yet).

    Pagination happens at the SQL level: rows are the Training Ø Training
    Participant join (LEFT JOIN so trainings without participants still yield
    exactly one row), sliced with LIMIT/OFFSET. ``page_size=0`` (or ``None``
    combined with ``page_size<=0``) returns the full dataset for CSV export.
    """
    if not (_is_admin() or _is_trainer()):
        frappe.throw(_("Only L&D Admin and Trainers can generate this report."))
    parts = str(month or "").split("-")
    if len(parts) != 2:
        frappe.throw(_("Month is required in YYYY-MM format."))
    try:
        year, mm = int(parts[0]), int(parts[1])
    except (TypeError, ValueError):
        frappe.throw(_("Month is required in YYYY-MM format."))
    if mm < 1 or mm > 12:
        frappe.throw(_("Month must be between 01 and 12."))
    last_day = calendar.monthrange(year, mm)[1]
    start = f"{year}-{mm:02d}-01"
    end = f"{year}-{mm:02d}-{last_day}"

    conds = [
        "t.docstatus < 2",
        "t.from_date <= %(end)s",
        "COALESCE(t.to_date, t.from_date) >= %(start)s",
    ]
    params = {"start": start, "end": end}
    for col in ("zone", "region", "district", "branch"):
        val = {"zone": zone, "region": region, "district": district, "branch": branch}[col]
        if val:
            conds.append(_geo_sql(col, val, "val_" + col, params))
    scope_cond = _owner_scope_sql(params)
    if scope_cond:
        conds.append(scope_cond)
    where = " AND ".join(conds)

    base = """
        FROM `tabTraining` t
        LEFT JOIN `tabTraining Participant` p
          ON p.parent = t.name AND p.parenttype = 'Training'
        WHERE {where}
    """.format(where=where)

    total = frappe.db.sql("SELECT COUNT(*) " + base, params)[0][0]

    page, page_size, offset = _paginate_args(page, page_size)
    if page_size:
        page_params = dict(params, page_size=page_size, offset=offset)
        rows = frappe.db.sql(
            "SELECT t.name AS training_name, t.training_program, t.from_date, t.to_date, "
            "t.trainer, t.is_adhoc, t.training_type, t.start_time, t.end_time, t.trainer_remarks, "
            "t.program_duration_hours, "
            "p.idx, p.reference_doctype, p.agent_employee, p.full_name, p.attendance_status "
            + base
            + " ORDER BY t.from_date ASC, t.start_time ASC, p.idx ASC "
            "LIMIT %(page_size)s OFFSET %(offset)s",
            page_params,
            as_dict=True,
        )
    else:
        rows = frappe.db.sql(
            "SELECT t.name AS training_name, t.training_program, t.from_date, t.to_date, "
            "t.trainer, t.is_adhoc, t.training_type, t.start_time, t.end_time, t.trainer_remarks, "
            "t.program_duration_hours, "
            "p.idx, p.reference_doctype, p.agent_employee, p.full_name, p.attendance_status "
            + base
            + " ORDER BY t.from_date ASC, t.start_time ASC, p.idx ASC",
            params,
            as_dict=True,
        )

    if not rows:
        return {"columns": MIS_REPORT_COLUMNS, "rows": [], "total": 0}

    # Per-training attendance buckets (for Attendance %); strict buckets —
    # only explicit Present counts, blank historic rows stay unmarked.
    _att = {}
    _pnames = list({r.training_name for r in rows if r.training_name})
    if _pnames:
        _ph = ", ".join(["%s"] * len(_pnames))
        for _parent, _status, _cnt in frappe.db.sql(
            f"SELECT parent, attendance_status, COUNT(*) FROM `tabTraining Participant` "
            f"WHERE parenttype = 'Training' AND parent IN ({_ph}) "
            f"GROUP BY parent, attendance_status",
            _pnames,
        ):
            _att.setdefault(_parent, {"Present": 0, "Absent": 0, "Unmarked": 0})
            if _status == "Present":
                _att[_parent]["Present"] = _cnt
            elif _status == "Absent":
                _att[_parent]["Absent"] = _cnt
            else:
                _att[_parent]["Unmarked"] = _att[_parent].get("Unmarked", 0) + _cnt

    # Only Employee-type participants can be enriched from Employee master
    emp_ids = {r.agent_employee for r in rows if r.agent_employee and r.reference_doctype == "Employee"}
    emp_data = _employee_master(emp_ids)
    mgr_names = _manager_names(emp_data)
    branch_ids = {
        (getattr(e, "sahayog_branch", "") or "") for e in emp_data.values()
        if getattr(e, "sahayog_branch", "")
    }
    branch_meta = _branch_meta(branch_ids)
    trainer_ids = _trainer_ids([_row_tag(t) for t in rows if t.trainer])

    out = []
    seq = offset
    for r in rows:
        seq += 1
        is_emp = (r.reference_doctype or "Employee") == "Employee"
        e = emp_data.get(r.agent_employee) if is_emp and r.agent_employee else None
        emp_branch_code = (getattr(e, "sahayog_branch", "") or "") if e else ""
        branch_meta_row = branch_meta.get(emp_branch_code) if emp_branch_code else None
        from_str = str(r.from_date or "")[:10]
        to_str = str(r.to_date or r.from_date or "")[:10]
        try:
            no_of_days = (frappe.utils.getdate(to_str) - frappe.utils.getdate(from_str)).days + 1
            if no_of_days < 1:
                no_of_days = 1
        except Exception:
            no_of_days = 1
        display_name = r.full_name or (e.employee_name if e else "") or r.agent_employee or ""
        # Attendance % is per-training (present ÷ invited), repeated on each row.
        _b = _att.get(r.training_name, {"Present": 0, "Absent": 0, "Unmarked": 0})
        _inv = _b.get("Present", 0) + _b.get("Absent", 0) + _b.get("Unmarked", 0)
        _pct = round(_b.get("Present", 0) * 100 / _inv, 1) if _inv else ""
        # Duration: computed from times, else the stored program hours.
        _dur = _training_hours(r.start_time, r.end_time, no_of_days)
        if _dur == "":
            try:
                _hrs = float(r.program_duration_hours or 0)
                _dur = int(_hrs) if _hrs and float(_hrs).is_integer() else (_hrs or "")
            except (TypeError, ValueError):
                _dur = ""
        out.append({
            "s_no": seq,
            "emp_id": (r.agent_employee or "") if is_emp else "",
            "name": display_name,
            "department": (e.department or "") if e else "",
            "division": (getattr(e, "custom_division", "") or "") if e else "",
            "designation": (e.designation or "") if e else "",
            "date_of_joining": str(e.date_of_joining or "")[:10] if e and e.date_of_joining else "",
            "manager_id": (e.reports_to or "") if e else "",
            "manager_name": mgr_names.get(e.reports_to) if e and e.reports_to else "",
            "branch_name": (
                (branch_meta_row.branch or branch_meta_row.name)
                if branch_meta_row
                else emp_branch_code or ((e.branch or "") if e else "")
            ),
            "state": (branch_meta_row.state or "") if branch_meta_row else "",
            "zone": (getattr(e, "custom_zone", "") or "") if e else "",
            "training_start_date": from_str,
            "training_end_date": to_str,
            "program_name": r.training_program or "",
            "program_sub_type": "",
            "training_type": r.training_type or "",
            "no_of_days": no_of_days,
            "duration_hours": _dur,
            "day_1": "",
            "day_2": "",
            "day_3": "",
            "day_4": "",
            "day_5": "",
            "day_6": "",
            "total_present": "" if not r.agent_employee else (1 if r.attendance_status == "Present" else 0),
            "attendance_pct": _pct,
            "pre_test_score": "",
            "post_test_score": "",
            "total_score": "",
            "passing_pct": "",
            "certification_status": "",
            "trainer_name": r.trainer or "",
            "trainer_id": trainer_ids.get(r.trainer) or "",
            "employee_status": (e.status or "") if e else "",
            "remarks": r.trainer_remarks or "",
        })
    return {"columns": MIS_REPORT_COLUMNS, "rows": out, "total": total}


# ─────────────────────────────────────────────────────────────────────────────
# Training Adherence & Costing report (L&D Admin)
# One row per training (not per participant). Column layout follows the
# client-shared sheet. Fields with no data source yet (invitations,
# verticle, scores, costing remark) return blank.
# ─────────────────────────────────────────────────────────────────────────────

ADHERENCE_REPORT_COLUMNS = [
    {"key": "facilitator_name", "label": "Facilitator Name"},
    {"key": "program_name", "label": "Program Name"},
    # NOTE (no data source yet — re-enable when tracked):
    # {"key": "training_verticle", "label": "Training Verticle"},
    {"key": "training_type", "label": "Training Type"},
    {"key": "start_date", "label": "Start Date"},
    {"key": "end_date", "label": "End Date"},
    {"key": "zone", "label": "Zone"},
    {"key": "training_location", "label": "Training Location"},
    # NOTE (needs invitation tracking):
    # {"key": "invitation_shared", "label": "Invitation Shared  ( Yes/No)"},
    {"key": "participants_invited", "label": "Number of participants invited"},
    # {"key": "additional_invitation", "label": "Additional Invitatation"},
    # {"key": "actual_invited", "label": "Actual Invited"},
    {"key": "training_completed", "label": "Training Completed/ Not Completed"},
    {"key": "training_status", "label": "Training Status"},
    {"key": "training_delivered", "label": "Training Delivered"},
    {"key": "attendance_marked", "label": "Attendance Marked"},
    {"key": "pre_assessment_taken", "label": "Pre-Assessment Taken"},
    {"key": "post_assessment_taken", "label": "Post-Assessment Taken"},
    {"key": "feedback_taken", "label": "Feedback Taken"},
    {"key": "participants_attended", "label": "Number of participants  attended the session"},
    {"key": "closure_report_shared", "label": "Clouser Report Shared  ( Yes/No)"},
    {"key": "absentee_count", "label": "Abseentee count"},
    {"key": "absentee_pct", "label": "Abseentee %"},
    {"key": "training_remark", "label": "Training Remark"},
    {"key": "budget_amount", "label": "Budget Amount"},
    {"key": "training_costing", "label": "Training Costing"},
    # NOTE (no budget-remark field on Training):
    # {"key": "costing_remark", "label": "Costing Remark"},
]


@frappe.whitelist()
def get_adherence_report(
    month,
    zone=None,
    region=None,
    district=None,
    branch=None,
    page=None,
    page_size=None,
):
    """Training-level adherence & costing rows for a month (YYYY-MM)."""
    if not (_is_admin() or _is_trainer()):
        frappe.throw(_("Only L&D Admin and Trainers can generate this report."))
    parts = str(month or "").split("-")
    if len(parts) != 2:
        frappe.throw(_("Month is required in YYYY-MM format."))
    try:
        year, mm = int(parts[0]), int(parts[1])
    except (TypeError, ValueError):
        frappe.throw(_("Month is required in YYYY-MM format."))
    if mm < 1 or mm > 12:
        frappe.throw(_("Month must be between 01 and 12."))
    last_day = calendar.monthrange(year, mm)[1]
    start = f"{year}-{mm:02d}-01"
    end = f"{year}-{mm:02d}-{last_day}"

    conds = [
        "t.docstatus < 2",
        "t.from_date <= %(end)s",
        "COALESCE(t.to_date, t.from_date) >= %(start)s",
    ]
    params = {"start": start, "end": end}
    for col in ("zone", "region", "district", "branch"):
        val = {"zone": zone, "region": region, "district": district, "branch": branch}[col]
        if val:
            conds.append(_geo_sql(col, val, "val_" + col, params))
    scope_cond = _owner_scope_sql(params)
    if scope_cond:
        conds.append(scope_cond)
    where = " AND ".join(conds)

    base = "FROM `tabTraining` t WHERE {where}".format(where=where)
    total = frappe.db.sql("SELECT COUNT(*) " + base, params)[0][0]

    page, page_size, offset = _paginate_args(page, page_size)
    select_fields = (
        "SELECT t.name, t.training_program, t.training_type, t.from_date, t.to_date, "
        "t.trainer, t.zone, t.branch, t.training_location, t.status, t.docstatus, "
        "t.training_delivered, t.attendance_marked, t.pre_assessment_taken, "
        "t.post_assessment_taken, t.feedback_taken, t.number_of_participants, "
        "t.trainer_remarks, t.budget_amount, t.actual_expense, t.closure_sent "
    )
    order = " ORDER BY t.from_date ASC, t.start_time ASC"
    if page_size:
        page_params = dict(params, page_size=page_size, offset=offset)
        trainings = frappe.db.sql(
            select_fields + base + order + " LIMIT %(page_size)s OFFSET %(offset)s",
            page_params,
            as_dict=True,
        )
    else:
        trainings = frappe.db.sql(select_fields + base + order, params, as_dict=True)

    if not trainings:
        return {"columns": ADHERENCE_REPORT_COLUMNS, "rows": [], "total": 0}

    # Attendance + participant counts per training
    names = [t.name for t in trainings]
    placeholders = ", ".join(["%s"] * len(names))
    counts = {}
    for parent, status, cnt in frappe.db.sql(
        f"SELECT parent, attendance_status, COUNT(*) FROM `tabTraining Participant` "
        f"WHERE parenttype = 'Training' AND parent IN ({placeholders}) "
        f"GROUP BY parent, attendance_status",
        names,
    ):
        # Strict buckets: only explicit Present/Absent count; anything else
        # (e.g. blank historic rows) stays unmarked, never assumed Present.
        bucket = {"Present": 0, "Absent": 0, "Unmarked": 0}
        counts.setdefault(parent, dict(bucket))
        if status == "Present":
            counts[parent]["Present"] = cnt
        elif status == "Absent":
            counts[parent]["Absent"] = cnt
        else:
            counts[parent]["Unmarked"] = counts[parent].get("Unmarked", 0) + cnt

    out = []
    seq = offset
    geo_map = _get_geographies_map([t.name for t in trainings])
    branch_codes = set()
    for t in trainings:
        for g in geo_map.get(t.name, []):
            if g["branch"]:
                branch_codes.add(g["branch"])
        if t.branch:
            branch_codes.add(t.branch)
    branch_meta = _branch_meta(branch_codes)

    def _branch_label(code):
        if not code:
            return ""
        m = branch_meta.get(code)
        disp = (m.branch or "") if m else ""
        return f"{code} - {disp}" if disp else code

    for t in trainings:
        seq += 1
        c = counts.get(t.name, {"Present": 0, "Absent": 0, "Unmarked": 0})
        present = c.get("Present", 0)
        absent = c.get("Absent", 0)
        invited = present + absent + c.get("Unmarked", 0)
        # Bulk trainings have no participant rows yet — fall back to the
        # expected headcount so "invited" is never understated.
        try:
            expected = int(t.number_of_participants or 0)
        except (TypeError, ValueError):
            expected = 0
        if expected > invited:
            invited = expected
        status = t.status or get_training_status(_row_tag(t))
        geos = geo_map.get(t.name, [])
        codes = [g["branch"] for g in geos if g["branch"]] or ([t.branch] if t.branch else [])
        out.append({
            "s_no": seq,
            "facilitator_name": t.trainer or "",
            "program_name": t.training_program or "",
            "training_verticle": "",
            "training_type": t.training_type or "",
            "start_date": str(t.from_date or "")[:10],
            "end_date": str(t.to_date or t.from_date or "")[:10],
            "zone": t.zone or "",
            "training_location": "; ".join(_branch_label(x) for x in codes),
            "invitation_shared": "",
            "participants_invited": invited,
            "additional_invitation": "",
            "actual_invited": "",
            "training_completed": "Completed" if status == "Completed" else "Not Completed",
            "training_status": status,
            "training_delivered": "Yes" if t.training_delivered else "No",
            "attendance_marked": "Yes" if t.attendance_marked else "No",
            "pre_assessment_taken": "Yes" if t.pre_assessment_taken else "No",
            "post_assessment_taken": "Yes" if t.post_assessment_taken else "No",
            "feedback_taken": "Yes" if t.feedback_taken else "No",
            "participants_attended": present,
            "closure_report_shared": "Yes" if t.closure_sent else "No",
            "absentee_count": absent,
            "absentee_pct": round(absent * 100 / invited, 1) if invited else "",
            "training_remark": t.trainer_remarks or "",
            "budget_amount": t.budget_amount or "",
            "training_costing": t.actual_expense or "",
            "costing_remark": "",
        })
    return {"columns": ADHERENCE_REPORT_COLUMNS, "rows": out, "total": total}


# ─────────────────────────────────────────────────────────────────────────────
# Trainer Performance report: one row per trainer (trainer × status matrix)
# ─────────────────────────────────────────────────────────────────────────────

TRAINER_REPORT_COLUMNS = [
    {"key": "trainer_id", "label": "Trainer ID"},
    {"key": "trainer_name", "label": "Trainer Name"},
    {"key": "branch", "label": "Branch"},
    {"key": "total", "label": "Trainings"},
    {"key": "upcoming", "label": "Upcoming"},
    {"key": "inprogress", "label": "In Progress"},
    {"key": "completed", "label": "Completed"},
    {"key": "pending", "label": "Pending"},
    {"key": "overdue", "label": "Overdue"},
    {"key": "participants", "label": "Participants"},
    {"key": "hours", "label": "Training Hours"},
]


@frappe.whitelist()
def get_trainer_performance_report(
    month,
    zone=None,
    region=None,
    district=None,
    branch=None,
    page=None,
    page_size=None,
):
    """Trainer × status matrix for a month (YYYY-MM).

    One row per trainer with training counts by status, total participants
    handled and total program hours. Admins see all trainers; trainers see
    only their own row (same owner-scope policy as other reports).
    """
    if not (_is_admin() or _is_trainer()):
        frappe.throw(_("Only L&D Admin and Trainers can generate this report."))
    parts = str(month or "").split("-")
    if len(parts) != 2:
        frappe.throw(_("Month is required in YYYY-MM format."))
    try:
        year, mm = int(parts[0]), int(parts[1])
    except (TypeError, ValueError):
        frappe.throw(_("Month is required in YYYY-MM format."))
    if mm < 1 or mm > 12:
        frappe.throw(_("Month must be between 01 and 12."))
    last_day = calendar.monthrange(year, mm)[1]
    start = f"{year}-{mm:02d}-01"
    end = f"{year}-{mm:02d}-{last_day}"

    conds = [
        "t.docstatus < 2",
        "t.from_date <= %(end)s",
        "COALESCE(t.to_date, t.from_date) >= %(start)s",
    ]
    params = {"start": start, "end": end}
    for col in ("zone", "region", "district", "branch"):
        val = {"zone": zone, "region": region, "district": district, "branch": branch}[col]
        if val:
            conds.append(_geo_sql(col, val, "val_" + col, params))
    scope_cond = _owner_scope_sql(params)
    if scope_cond:
        conds.append(scope_cond)
    where = " AND ".join(conds)

    trainings = frappe.db.sql(
        "SELECT t.name, t.training_program, t.from_date, t.to_date, t.trainer, "
        "t.program_duration_hours, t.training_delivered, t.attendance_marked, "
        "t.pre_assessment_taken, t.post_assessment_taken, t.feedback_taken, t.status "
        "FROM `tabTraining` t WHERE {where} "
        "ORDER BY t.from_date ASC, t.start_time ASC".format(where=where),
        params,
        as_dict=True,
    )
    if not trainings:
        return {"columns": TRAINER_REPORT_COLUMNS, "rows": [], "total": 0}

    names = [t.name for t in trainings]
    placeholders = ", ".join(["%s"] * len(names))
    pcounts = {}
    for parent, cnt in frappe.db.sql(
        f"SELECT parent, COUNT(*) FROM `tabTraining Participant` "
        f"WHERE parenttype = 'Training' AND parent IN ({placeholders}) "
        f"GROUP BY parent",
        names,
    ):
        pcounts[parent] = cnt

    today_str = str(frappe.utils.getdate())
    agg = {}
    for t in trainings:
        trainer = (t.trainer or "").strip()
        if not trainer:
            continue
        a = agg.setdefault(trainer, {
            "total": 0, "upcoming": 0, "inprogress": 0, "completed": 0,
            "pending": 0, "overdue": 0, "participants": 0, "hours": 0.0,
        })
        a["total"] += 1
        status = t.status or get_training_status(_row_tag(t))
        end_str = str(t.to_date or t.from_date or "")[:10]
        if status == "Completed":
            a["completed"] += 1
        elif status == "In Progress":
            a["inprogress"] += 1
        elif status == "Upcoming":
            a["upcoming"] += 1
        else:
            a["pending"] += 1
        if end_str and end_str < today_str and status != "Completed":
            a["overdue"] += 1
        a["participants"] += pcounts.get(t.name, 0)
        try:
            a["hours"] += float(t.program_duration_hours or 0)
        except (TypeError, ValueError):
            pass

    trainer_ids = _trainer_ids([_row_tag({"trainer": name}) for name in agg])
    emp_data = _employee_master({tid for tid in trainer_ids.values() if tid})
    emp_by_name = {}
    for emp_id, e in emp_data.items():
        if getattr(e, "employee_name", ""):
            emp_by_name[e.employee_name] = e

    out = []
    for name, a in agg.items():
        tid = trainer_ids.get(name) or ""
        e = emp_data.get(tid) if tid else emp_by_name.get(name)
        branch_code = (getattr(e, "sahayog_branch", "") or "") if e else ""
        hours = round(a["hours"], 1)
        out.append({
            "trainer_id": tid,
            "trainer_name": name,
            "branch": branch_code,
            "total": a["total"],
            "upcoming": a["upcoming"],
            "inprogress": a["inprogress"],
            "completed": a["completed"],
            "pending": a["pending"],
            "overdue": a["overdue"],
            "participants": a["participants"],
            "hours": int(hours) if float(hours).is_integer() else hours,
        })
    out.sort(key=lambda r: (-r["total"], r["trainer_name"]))

    total = len(out)
    page, page_size, offset = _paginate_args(page, page_size)
    if page_size:
        out = out[offset:offset + page_size]
    return {"columns": TRAINER_REPORT_COLUMNS, "rows": out, "total": total}


class _RowTag(dict):
    """Minimal mapping so get_training_status / _trainer_ids accept a row."""

    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError:
            return None


def _row_tag(row):
    return _RowTag((row or {}).items() if isinstance(row, dict) else {})


def _paginate_args(page, page_size):
    """Normalise (page, page_size, offset). page_size<=0/None-with-0 => no limit (all rows)."""
    if page_size in (None, 0):
        return 1, 0, 0
    try:
        page = max(1, int(page or 1))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = max(1, int(page_size or 50))
    except (TypeError, ValueError):
        page_size = 50
    return page, page_size, (page - 1) * page_size


# ─────────────────────────────────────────────────────────────────────────────
# Employee-wise training report (L&D Admin)
# BRD: "Employee wise training report for training attended YTD."
# ─────────────────────────────────────────────────────────────────────────────

EMPLOYEE_REPORT_COLUMNS = [
    {"key": "s_no", "label": "S.No"},
    {"key": "emp_id", "label": "Emp ID"},
    {"key": "employee_name", "label": "Employee Name"},
    {"key": "department", "label": "Department"},
    {"key": "division", "label": "Division"},
    {"key": "designation", "label": "Designation"},
    {"key": "branch_name", "label": "Branch"},
    {"key": "zone", "label": "Zone"},
    {"key": "training_date", "label": "Training Date"},
    {"key": "program_name", "label": "Training/Program Name"},
    {"key": "trainer_name", "label": "Trainer Name"},
    {"key": "status", "label": "Training Status"},
    {"key": "training_delivered", "label": "Training Delivered"},
    {"key": "attendance_marked", "label": "Attendance Marked"},
    {"key": "pre_assessment_taken", "label": "Pre-Assessment Taken"},
    {"key": "post_assessment_taken", "label": "Post-Assessment Taken"},
    {"key": "feedback_taken", "label": "Feedback Taken"},
]


@frappe.whitelist()
def get_employee_training_report(
    employee=None,
    from_date=None,
    to_date=None,
    zone=None,
    region=None,
    district=None,
    branch=None,
    page=None,
    page_size=None,
):
    """Employee-wise training history. One row per training participant.

    Defaults to the current financial year-to-date when no date bounds are given.
    Rows are paged at the SQL level (INNER JOIN on participants, LIMIT/OFFSET);
    ``page_size=0``/``None`` returns the full dataset for CSV export.
    """
    if not (_is_admin() or _is_trainer()):
        frappe.throw(_("Only L&D Admin and Trainers can generate this report."))

    today_dt = frappe.utils.getdate()
    from_dt = frappe.utils.getdate(from_date) if from_date else frappe.utils.getdate(f"{today_dt.year}-01-01")
    to_dt = frappe.utils.getdate(to_date) if to_date else today_dt
    if from_dt > to_dt:
        frappe.throw(_("From Date cannot be after To Date."))

    conds = [
        "t.docstatus < 2",
        "t.from_date <= %(to_dt)s",
        "COALESCE(t.to_date, t.from_date) >= %(from_dt)s",
    ]
    params = {"from_dt": str(from_dt), "to_dt": str(to_dt)}
    for col in ("zone", "region", "district", "branch"):
        val = {"zone": zone, "region": region, "district": district, "branch": branch}[col]
        if val:
            conds.append(_geo_sql(col, val, "val_" + col, params))
    scope_cond = _owner_scope_sql(params)
    if scope_cond:
        conds.append(scope_cond)

    q = (employee or "").strip().lower()
    if q:
        conds.append(
            "(LOWER(p.agent_employee) LIKE %(q)s OR LOWER(p.full_name) LIKE %(q)s)"
        )
        params["q"] = f"%{q}%"

    where = " AND ".join(conds)

    base = """
        FROM `tabTraining` t
        INNER JOIN `tabTraining Participant` p
          ON p.parent = t.name AND p.parenttype = 'Training'
        WHERE {where}
    """.format(where=where)

    total = frappe.db.sql("SELECT COUNT(*) " + base, params)[0][0]

    page, page_size, offset = _paginate_args(page, page_size)
    if page_size:
        page_params = dict(params, page_size=page_size, offset=offset)
        rows = frappe.db.sql(
            "SELECT t.name AS training_name, t.training_program, t.from_date, t.to_date, "
            "t.trainer, t.zone, t.training_delivered, t.attendance_marked, "
            "t.pre_assessment_taken, t.post_assessment_taken, t.feedback_taken, t.status, t.docstatus, "
            "p.idx, p.reference_doctype, p.agent_employee, p.full_name "
            + base
            + " ORDER BY t.from_date ASC, t.start_time ASC, p.idx ASC "
            "LIMIT %(page_size)s OFFSET %(offset)s",
            page_params,
            as_dict=True,
        )
    else:
        rows = frappe.db.sql(
            "SELECT t.name AS training_name, t.training_program, t.from_date, t.to_date, "
            "t.trainer, t.zone, t.training_delivered, t.attendance_marked, "
            "t.pre_assessment_taken, t.post_assessment_taken, t.feedback_taken, t.status, t.docstatus, "
            "p.idx, p.reference_doctype, p.agent_employee, p.full_name "
            + base
            + " ORDER BY t.from_date ASC, t.start_time ASC, p.idx ASC",
            params,
            as_dict=True,
        )

    if not rows:
        return {"columns": EMPLOYEE_REPORT_COLUMNS, "rows": [], "total": 0}

    emp_ids = {r.agent_employee for r in rows if r.agent_employee and r.reference_doctype == "Employee"}
    emp_data = _employee_master(emp_ids)
    branch_ids = {
        (getattr(e, "sahayog_branch", "") or "") for e in emp_data.values()
        if getattr(e, "sahayog_branch", "")
    }
    branch_meta = _branch_meta(branch_ids)

    def _yn(v):
        return "Yes" if v else "No"

    out = []
    seq = offset
    for r in rows:
        seq += 1
        is_emp = (r.reference_doctype or "Employee") == "Employee"
        e = emp_data.get(r.agent_employee) if is_emp and r.agent_employee else None
        emp_branch_code = (getattr(e, "sahayog_branch", "") or "") if e else ""
        branch_meta_row = branch_meta.get(emp_branch_code) if emp_branch_code else None
        date_label = str(r.from_date or "")[:10]
        if r.to_date and str(r.to_date)[:10] != str(r.from_date or "")[:10]:
            date_label += " to " + str(r.to_date)[:10]
        display_name = r.full_name or (e.employee_name if e else "") or r.agent_employee or ""
        status = r.status or get_training_status(_row_tag(r))
        out.append({
            "s_no": seq,
            "emp_id": (r.agent_employee or "") if is_emp else "",
            "employee_name": display_name,
            "department": (e.department or "") if e else "",
            "division": (getattr(e, "custom_division", "") or "") if e else "",
            "designation": (e.designation or "") if e else "",
            "branch_name": (
                (branch_meta_row.branch or branch_meta_row.name)
                if branch_meta_row
                else emp_branch_code or ((e.branch or "") if e else "")
            ),
            "zone": (getattr(e, "custom_zone", "") or "") or (r.zone or ""),
            "training_date": date_label,
            "program_name": r.training_program or "",
            "trainer_name": r.trainer or "",
            "status": status or "",
            "training_delivered": _yn(r.training_delivered),
            "attendance_marked": _yn(r.attendance_marked),
            "pre_assessment_taken": _yn(r.pre_assessment_taken),
            "post_assessment_taken": _yn(r.post_assessment_taken),
            "feedback_taken": _yn(r.feedback_taken),
        })
    return {"columns": EMPLOYEE_REPORT_COLUMNS, "rows": out, "total": total}


# ─────────────────────────────────────────────────────────────────────────────
# Team training view (Team Leaders)
# Same shape as the employee-wise report but scoped to the current user's
# reportees. Any role with a team can use it — no L&D Admin rights needed.
# ─────────────────────────────────────────────────────────────────────────────

TEAM_REPORT_COLUMNS = [
    {"key": "training_date", "label": "Date"},
    {"key": "employee_name", "label": "Employee"},
    {"key": "program_name", "label": "Training/Program"},
    {"key": "time_range", "label": "Time"},
    {"key": "location", "label": "Location"},
    {"key": "trainer_name", "label": "Trainer"},
    {"key": "status", "label": "Status"},
]


def _pretty_date_range(from_date, to_date):
    """Leader-friendly range: '17 Sep 2026' or '15–17 Sep 2026'."""
    try:
        f = frappe.utils.getdate(from_date) if from_date else None
        t = frappe.utils.getdate(to_date) if to_date else None
    except Exception:
        return str(from_date or "")[:10]
    if not f:
        return ""
    if not t or t == f:
        return f.strftime("%d %b %Y").lstrip("0")
    if f.year == t.year and f.month == t.month:
        return f"{f.day}–{t.day} {f.strftime('%b %Y')}"
    if f.year == t.year:
        return f"{f.strftime('%d %b')} – {t.strftime('%d %b %Y')}".replace(" 0", " ")
    return f"{f.strftime('%d %b %Y').lstrip('0')} – {t.strftime('%d %b %Y').lstrip('0')}"


@frappe.whitelist()
def get_my_team_members():
    """Reportees of the current user with all-time training counts."""
    team_ids = _require_team_access()
    members = frappe.db.get_all(
        "Employee",
        filters={"name": ["in", team_ids]},
        fields=["name", "employee_name"],
        order_by="employee_name asc",
        limit_page_length=0,
    )
    counts = {}
    placeholders = ", ".join(["%s"] * len(team_ids))
    for emp, cnt in frappe.db.sql(
        f"SELECT agent_employee, COUNT(*) FROM `tabTraining Participant` "
        f"WHERE parenttype = 'Training' AND agent_employee IN ({placeholders}) "
        f"GROUP BY agent_employee",
        team_ids,
    ):
        counts[emp] = cnt
    return [
        {
            "emp_id": m.name,
            "employee_name": m.employee_name or m.name,
            "training_count": counts.get(m.name, 0),
        }
        for m in members
    ]


@frappe.whitelist()
def get_team_training_report(
    employee=None,
    from_date=None,
    to_date=None,
    page=None,
    page_size=None,
):
    """Team-scoped training history. One row per team-member participant.

    Same enrichment as the employee-wise report; defaults to the current
    financial year-to-date when no date bounds are given.
    """
    team_ids = _require_team_access()

    today_dt = frappe.utils.getdate()
    from_dt = frappe.utils.getdate(from_date) if from_date else frappe.utils.getdate(f"{today_dt.year}-01-01")
    to_dt = frappe.utils.getdate(to_date) if to_date else today_dt
    if from_dt > to_dt:
        frappe.throw(_("From Date cannot be after To Date."))

    placeholders = ", ".join(["%s"] * len(team_ids))
    conds = [
        "t.docstatus < 2",
        "t.from_date <= %(to_dt)s",
        "COALESCE(t.to_date, t.from_date) >= %(from_dt)s",
    ]
    params = {"from_dt": str(from_dt), "to_dt": str(to_dt)}
    team_keys = []
    for i, emp_id in enumerate(team_ids):
        key = f"team_{i}"
        team_keys.append(f"%({key})s")
        params[key] = emp_id
    conds.append(f"p.agent_employee IN ({', '.join(team_keys)})")

    q = (employee or "").strip().lower()
    if q:
        # Search covers member (id/name) + trainer + program so reporting
        # managers can find trainings either way (additive ORs only).
        conds.append(
            "(LOWER(p.agent_employee) LIKE %(q)s OR LOWER(p.full_name) LIKE %(q)s "
            "OR LOWER(t.trainer) LIKE %(q)s OR LOWER(t.training_program) LIKE %(q)s)"
        )
        params["q"] = f"%{q}%"

    where = " AND ".join(conds)

    base = """
        FROM `tabTraining` t
        INNER JOIN `tabTraining Participant` p
          ON p.parent = t.name AND p.parenttype = 'Training'
        WHERE {where}
    """.format(where=where)

    total = frappe.db.sql("SELECT COUNT(*) " + base, params)[0][0]

    page, page_size, offset = _paginate_args(page, page_size)
    select_fields = (
        "SELECT t.name AS training_name, t.training_program, t.from_date, t.to_date, "
        "t.start_time, t.end_time, t.trainer, t.training_location, "
        "t.training_delivered, t.attendance_marked, "
        "t.pre_assessment_taken, t.post_assessment_taken, t.feedback_taken, t.status, t.docstatus, "
        "p.idx, p.reference_doctype, p.agent_employee, p.full_name "
    )
    order_limit = " ORDER BY t.from_date ASC, t.start_time ASC, p.idx ASC"
    if page_size:
        page_params = dict(params, page_size=page_size, offset=offset)
        rows = frappe.db.sql(
            select_fields + base + order_limit + " LIMIT %(page_size)s OFFSET %(offset)s",
            page_params,
            as_dict=True,
        )
    else:
        rows = frappe.db.sql(select_fields + base + order_limit, params, as_dict=True)

    if not rows:
        return {"columns": TEAM_REPORT_COLUMNS, "rows": [], "total": 0}

    emp_ids = {r.agent_employee for r in rows if r.agent_employee}
    emp_data = _employee_master(emp_ids)
    branch_ids = {
        (getattr(e, "sahayog_branch", "") or "") for e in emp_data.values()
        if getattr(e, "sahayog_branch", "")
    }
    branch_meta = _branch_meta(branch_ids)

    def _yn(v):
        return "Yes" if v else "No"

    out = []
    seq = offset
    for r in rows:
        seq += 1
        e = emp_data.get(r.agent_employee) if r.agent_employee else None
        emp_branch_code = (getattr(e, "sahayog_branch", "") or "") if e else ""
        branch_meta_row = branch_meta.get(emp_branch_code) if emp_branch_code else None
        from_str = str(r.from_date or "")[:10]
        to_str = str(r.to_date or r.from_date or "")[:10]
        display_name = r.full_name or (e.employee_name if e else "") or r.agent_employee or ""
        status = r.status or get_training_status(_row_tag(r))
        start_fmt = _format_time(r.start_time)
        end_fmt = _format_time(r.end_time)
        if start_fmt and end_fmt:
            time_range = f"{start_fmt} – {end_fmt}"
        else:
            time_range = start_fmt or "—"
        branch_fallback = (
            (branch_meta_row.branch or branch_meta_row.name)
            if branch_meta_row
            else emp_branch_code or ((e.branch or "") if e else "")
        )
        out.append({
            "s_no": seq,
            "name": r.training_name,
            "emp_id": r.agent_employee or "",
            "employee_name": display_name,
            "from_date": from_str,
            "to_date": to_str,
            "training_date": _pretty_date_range(from_str, to_str),
            "program_name": r.training_program or "",
            "time_range": time_range,
            "location": r.training_location or branch_fallback or "—",
            "trainer_name": r.trainer or "",
            "status": status or "",
            "docstatus": r.docstatus,
            "training_delivered": r.training_delivered or 0,
            "attendance_marked": r.attendance_marked or 0,
            "pre_assessment_taken": r.pre_assessment_taken or 0,
            "post_assessment_taken": r.post_assessment_taken or 0,
            "feedback_taken": r.feedback_taken or 0,
        })
    return {"columns": TEAM_REPORT_COLUMNS, "rows": out, "total": total}


@frappe.whitelist()
def get_trainer_options(enabled_only=True):
    """Active employees to pick as trainer / participants in the Add Training form."""
    filters = {}
    if enabled_only:
        filters["status"] = "Active"
    fields = ["name", "employee_name", "sahayog_branch"]
    # Optional enrichment for the 70/30 participant tables (backward-compatible:
    # extra keys are ignored by old frontends).
    for extra in ("department", "designation", "custom_division"):
        try:
            if frappe.db.has_column("Employee", extra):
                fields.append(extra)
        except Exception:
            pass
    return frappe.db.get_all(
        "Employee",
        filters=filters,
        fields=fields,
        order_by="employee_name asc",
        limit_page_length=0,
    )


@frappe.whitelist()
def get_agent_options(enabled_only=True):
    """Agents to pick as participants in the Add Training form.
    Filters by agent_status = 'live' (case-insensitive) when enabled_only is truthy.
    """
    if enabled_only:
        # Live agents only. Status vocabulary differs across sites
        # ('live' vs 'active'), so accept both; closed/inactive stay out.
        rows = frappe.db.sql(
            "SELECT name, agent_name, branch_name FROM `tabAgent` "
            "WHERE LOWER(TRIM(agent_status)) IN ('live', 'active') ORDER BY agent_name ASC",
            as_dict=True,
        )
        return rows
    return frappe.db.get_all(
        "Agent",
        fields=["name", "agent_name", "branch_name"],
        order_by="agent_name asc",
        limit_page_length=0,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Permissions helpers
# ─────────────────────────────────────────────────────────────────────────────

def _require_can_write():
    if not (_is_admin() or _is_trainer()):
        frappe.throw("You don't have permission to create trainings.")


def _ensure_can_update(doc):
    if _is_admin():
        return
    emp = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, ["name", "employee_name"], as_dict=True) or {}
    emp_id = emp.get("name")
    emp_name = emp.get("employee_name")
    is_owner = (
        doc.owner == frappe.session.user
        or (emp_id and doc.trainer == emp_id)
        or (emp_name and doc.trainer == emp_name)
    )
    if not is_owner:
        frappe.throw(_("You don't have permission to update this training."))


def _require_completed(doc):
    """Extended trainer rights (type/time/budget) unlock only at 5/5 checks."""
    if not all(doc.get(f) for f in COMPLETION_FIELDS):
        frappe.throw(_("Allowed only after all completion checks are ticked."))


@frappe.whitelist()
def update_training_schedule(name, from_date=None, to_date=None, start_time=None, end_time=None, training_location=None, training_type=None, number_of_participants=None):
    """
    Reschedule a training — L&D Admin only, with one exception: the assigned
    trainer (owner or trainer match) may update training_type/start/end_time
    AFTER all 5 completion checks are ticked. Dates/location/count stay Admin.
    Updates date/time/location directly via db.set_value (no cancel/amend needed).
    Also accepts number_of_participants (expected headcount, Admin only).
    """
    if _is_admin():
        pass
    else:
        doc = frappe.get_doc("Training", name)
        _ensure_can_update(doc)
        _require_completed(doc)
        # Dates/location/count are Admin-only even after completion.
        if from_date is not None and str(from_date) != str(doc.from_date or ""):
            frappe.throw(_("Only L&D Admin can change training dates."))
        if to_date is not None and str(to_date) != str(doc.to_date or doc.from_date or ""):
            frappe.throw(_("Only L&D Admin can change training dates."))
        if training_location is not None and (training_location or "") != (doc.training_location or ""):
            frappe.throw(_("Only L&D Admin can change the location."))
        if number_of_participants is not None and int(number_of_participants or 0) != int(doc.number_of_participants or 0):
            frappe.throw(_("Only L&D Admin can change the expected headcount."))

    if not from_date:
        frappe.throw(_("From Date is required."))

    to_date = to_date or from_date
    if frappe.utils.getdate(to_date) < frappe.utils.getdate(from_date):
        frappe.throw(_("To Date cannot be before From Date."))

    start_norm = _normalize_time(start_time) if start_time else None
    end_norm   = _normalize_time(end_time)   if end_time   else None

    if start_norm and end_norm:
        if frappe.utils.get_time(end_norm) <= frappe.utils.get_time(start_norm):
            frappe.throw(_("End Time must be after Start Time."))

    updates = {
        "from_date": from_date,
        "to_date":   to_date,
    }
    if start_norm is not None:
        updates["start_time"] = start_norm
    if end_norm is not None:
        updates["end_time"] = end_norm
    if training_location is not None:
        updates["training_location"] = training_location
    if training_type is not None:
        if not training_type or training_type not in ("Classroom", "Virtual"):
            frappe.throw(_("Training Type is required and must be Classroom or Virtual."))
        updates["training_type"] = training_type
    if number_of_participants is not None:
        try:
            updates["number_of_participants"] = int(number_of_participants)
        except (TypeError, ValueError):
            frappe.throw(_("Number of Participants must be a whole number."))
        if updates["number_of_participants"] < 0:
            frappe.throw(_("Number of Participants cannot be negative."))

    for field, value in updates.items():
        frappe.db.set_value("Training", name, field, value)

    frappe.db.commit()
    return {"success": True}


@frappe.whitelist()
def delete_training(name):
    """Delete a training — L&D Admin only. Cancels first if submitted."""
    if not _is_admin():
        frappe.throw(_("Only L&D Admin can delete trainings."))
    doc = frappe.get_doc("Training", name)
    if doc.docstatus == 1:
        doc.cancel()
    frappe.delete_doc("Training", name)
    return {"success": True}



@frappe.whitelist()
def bulk_upload_training():
    # Bulk upload v2: one row = one training. Columns: Training Date,
    # Program Name (or Training Title), Branch Code (SOL ID), Trainer ID
    # (Employee ID), Training Duration (days), Number of Participants.
    if not _is_admin():
        frappe.throw(_("Only L&D Admin can bulk upload trainings."))
    from frappe.utils.csvutils import read_csv_content
    from frappe.utils.xlsxutils import read_xlsx_file_from_attached_file
    import re

    file_doc = frappe.request.files.get("file")
    if not file_doc:
        return {"success": False, "message": _("No file uploaded")}

    try:
        ext = file_doc.filename.rsplit(".", 1)[-1].lower() if "." in file_doc.filename else ""
        content = file_doc.read()
        if ext == "csv":
            rows = read_csv_content(content)
        elif ext in ("xlsx", "xls"):
            # read_xlsx needs a File doc
            tmp = frappe.get_doc({"doctype": "File", "file_name": file_doc.filename, "content": content})
            rows = read_xlsx_file_from_attached_file(tmp)
        else:
            return {"success": False, "message": _("Unsupported file format: '{0}'. Please upload CSV or XLSX").format(ext or "unknown")}
        if not rows or len(rows) < 2:
            return {"success": False, "message": _("File is empty or has no data rows")}
        header = [h.strip() for h in rows[0]]
        header_lower = [h.strip().lower() for h in header]
        # Required columns (case-insensitive). Client-sheet aliases accepted:
        # Date->Training Date, Topic->Program Name, Branch Name->Branch Code,
        # "Program Duration in hours..."->duration hours,
        # "Number of participants invited"->headcount.
        # Branch Code is OPTIONAL (row + training can exist without a branch).
        # Day is derived from the date; Zone/Region auto-fetch from branch;
        # "attended" is marked later in the portal — all three are ignored.
        # One row = one training; no participant rows are added here.
        required = []
        if "training date" not in header_lower and "date" not in header_lower:
            required.append("Training Date (or Date)")
        if "trainer id" not in header_lower:
            required.append("Trainer ID")
        if "program name" not in header_lower and "training title" not in header_lower and "topic" not in header_lower:
            required.append("Program Name / Training Title (or Topic)")
        if required:
            return {"success": False, "message": _("Missing required column(s): {0}. Found: {1}").format(", ".join(required), ", ".join(header))}

        # Map lower->index (+ client header variants)
        col_idx = {h.lower(): i for i, h in enumerate(header)}
        for _h, _key in list(col_idx.items()):
            if _h.startswith("program duration"):
                col_idx.setdefault("program duration in hours", col_idx[_h])
            if _h.startswith("number of participants invited"):
                col_idx.setdefault("number of participants", col_idx[_h])

        def get_val(row, *keys):
            for key in keys:
                idx = col_idx.get(key.lower())
                if idx is not None and idx < len(row):
                    val = str(row[idx] or "").strip()
                    if val:
                        return val
            return ""

        def parse_training_date(raw):
            # Supports DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD
            if "/" in raw:
                parts = raw.split("/")
                if len(parts) == 3:
                    dd = parts[0].zfill(2)
                    mm = parts[1].zfill(2)
                    yy = parts[2]
                    if len(yy) == 2:
                        yy = "20" + yy
                    dated = f"{yy}-{mm}-{dd}"
                    frappe.utils.getdate(dated)  # validate
                    return dated
            return str(frappe.utils.getdate(raw))

        # System zone/region masters (for fuzzy sheet matching)
        valid_zones = [r[0] for r in frappe.db.sql(
            "SELECT DISTINCT zone FROM `tabSahayog Branch` "
            "WHERE zone IS NOT NULL AND zone != '' ORDER BY zone")]
        valid_regions = [r[0] for r in frappe.db.sql(
            "SELECT DISTINCT region FROM `tabSahayog Branch` "
            "WHERE region IS NOT NULL AND region != '' ORDER BY region")]

        def resolve_geo(raw, valid):
            """Sheet value -> system value. Exact (spacing/case-insensitive)
            first, then known aliases (HO = head office), then number-based
            (e.g. 'Zone 1' -> 'ZONE-1'). None = no match."""
            import re as _re
            token = _re.sub(r"\s+", " ", (raw or "")).strip().lower()
            if not token:
                return ""
            aliases = {
                "head office": "HO", "headoffice": "HO", "h.o.": "HO",
                "h o": "HO", "ho.": "HO",
            }
            if token in aliases and aliases[token] in valid:
                return aliases[token]
            lmap = {str(v).lower(): v for v in valid}
            if token in lmap:
                return lmap[token]
            m = _re.search(r"(\d+)", token)
            if m:
                num = m.group(1).lstrip("0") or "0"
                for v in valid:
                    vm = _re.search(r"(\d+)", str(v))
                    if vm and (vm.group(1).lstrip("0") or "0") == num:
                        return v
            return None

        trainings = []
        errors = []
        for i, row in enumerate(rows[1:], start=2):
            if not any(str(c or "").strip() for c in row):
                continue
            training_date_raw = get_val(row, "Training Date", "Date")
            program = get_val(row, "Program Name", "Training Title", "Topic")
            branch_raw = get_val(row, "Branch Code", "Branch Name")
            trainer_id = get_val(row, "Trainer ID")
            type_raw = get_val(row, "Training Type", "Type")
            duration_raw = get_val(row, "Training Days", "Training Duration", "Duration", "Duration (Days)")
            count_raw = get_val(row, "Number of Participants", "No. of Participants", "Participants Count", "Participant Count")
            hours_raw = get_val(row, "Program Duration in Hours", "Program Duration", "Duration in Hours", "Duration Hours")

            if not training_date_raw:
                errors.append(f"Row {i}: Training Date is required")
                continue
            try:
                training_date = parse_training_date(training_date_raw)
            except Exception as e:
                errors.append(f"Row {i}: Invalid Training Date '{training_date_raw}': {e}")
                continue
            if not program:
                errors.append(f"Row {i}: Program Name / Training Title is required")
                continue
            # Branch is optional: resolve when given, else blank geography.
            branch_code = ""
            if branch_raw:
                # SOL ID (Sahayog Branch.name) first, display name as fallback
                branch_code = frappe.db.get_value("Sahayog Branch", branch_raw, "name") or frappe.db.get_value("Sahayog Branch", {"branch": branch_raw}, "name")
                if not branch_code:
                    branch_code = frappe.db.get_value("Sahayog Branch", {"branch": ["like", branch_raw]}, "name")
                if not branch_code:
                    errors.append(f"Row {i}: Branch '{branch_raw}' not found")
                    continue
            if not trainer_id:
                errors.append(f"Row {i}: Trainer ID is required")
                continue
            if not frappe.db.exists("Employee", trainer_id):
                errors.append(f"Row {i}: Trainer ID '{trainer_id}' not found")
                continue
            trainer_name = frappe.db.get_value("Employee", trainer_id, "employee_name") or trainer_id
            # Training Type: Classroom / Virtual (case & spacing tolerant)
            type_token = "".join(str(type_raw or "").split()).lower()
            if type_token in ("classroom",):
                training_type = "Classroom"
            elif type_token in ("virtual",):
                training_type = "Virtual"
            else:
                errors.append(f"Row {i}: Training Type must be Classroom or Virtual (found '{type_raw}')")
                continue
            # Zone / Region: fuzzy-match sheet value to system master, then
            # cross-check against the branch's own geography (when a branch
            # is given). Sheet wins when the branch master is blank;
            # conflicts are rejected.
            branch_geo = frappe.db.get_value("Sahayog Branch", branch_code, ["zone", "region"], as_dict=True) if branch_code else None
            zone_sheet = resolve_geo(get_val(row, "Zone"), valid_zones)
            region_sheet = resolve_geo(get_val(row, "Region"), valid_regions)
            if get_val(row, "Zone") and zone_sheet is None:
                errors.append(f"Row {i}: Zone '{get_val(row, 'Zone')}' not recognised (valid: {', '.join(valid_zones)})")
                continue
            if get_val(row, "Region") and region_sheet is None:
                errors.append(f"Row {i}: Region '{get_val(row, 'Region')}' not recognised (valid: {', '.join(valid_regions)})")
                continue
            _bz = (branch_geo.zone or "") if branch_geo else ""
            _br = (branch_geo.region or "") if branch_geo else ""
            zone_final = zone_sheet or _bz
            region_final = region_sheet or _br
            if zone_sheet and _bz and zone_sheet != _bz:
                errors.append(f"Row {i}: Zone '{zone_sheet}' does not match branch '{branch_code}' (branch is in '{_bz}')")
                continue
            if region_sheet and _br and region_sheet != _br:
                errors.append(f"Row {i}: Region '{region_sheet}' does not match branch '{branch_code}' (branch is in '{_br}')")
                continue
            if not duration_raw:
                duration = 1
            else:
                try:
                    duration = int(float(duration_raw))
                except Exception:
                    errors.append(f"Row {i}: Invalid Training Duration '{duration_raw}'")
                    continue
                if duration < 1:
                    errors.append(f"Row {i}: Training Duration must be 1 or more")
                    continue
            if not count_raw:
                count = 0
            else:
                try:
                    count = int(float(count_raw))
                except Exception:
                    errors.append(f"Row {i}: Invalid Number of Participants '{count_raw}'")
                    continue
                if count < 0:
                    errors.append(f"Row {i}: Number of Participants cannot be negative")
                    continue
            # Program duration in hours: numbers only, blank allowed
            if not hours_raw:
                hours = None
            else:
                try:
                    hours = float(hours_raw)
                except Exception:
                    errors.append(f"Row {i}: Invalid Program Duration in Hours '{hours_raw}' (numbers only)")
                    continue
                if hours < 0:
                    errors.append(f"Row {i}: Program Duration in Hours cannot be negative")
                    continue
            trainings.append({
                "training_date": training_date,
                "program": program.strip(),
                "branch_code": branch_code,
                "trainer_name": trainer_name.strip(),
                "training_type": training_type,
                "zone": zone_final,
                "region": region_final,
                "duration": duration,
                "count": count,
                "hours": hours,
            })

        if not trainings:
            return {"success": False, "message": _("No valid trainings found"), "errors": errors}

        created = 0
        skipped = 0
        seen = set()
        for t in trainings:
            from_date = t["training_date"]
            # Duration: to_date = from_date + (duration - 1)
            to_date = str(frappe.utils.add_days(from_date, t["duration"] - 1))
            # Skip when the same program already exists on the same date
            # (trainer may differ) — within file and in the database.
            key = (from_date, t["program"].strip().lower())
            try:
                if key in seen or frappe.db.exists("Training", {"from_date": from_date, "training_program": t["program"]}):
                    skipped += 1
                    seen.add(key)
                    continue
                seen.add(key)
                doc = frappe.new_doc("Training")
                doc.training_program = t["program"]
                doc.from_date = from_date
                doc.to_date = to_date
                doc.trainer = t["trainer_name"]
                doc.training_type = t["training_type"]
                doc.number_of_participants = t["count"]
                if t["hours"] is not None:
                    doc.program_duration_hours = t["hours"]
                doc.start_time = ""
                doc.end_time = ""
                # Branch geography only when a branch was given (district from
                # master); otherwise zone/region live on the legacy fields.
                if t["branch_code"]:
                    _dgeo = frappe.db.get_value("Sahayog Branch", t["branch_code"], ["district"], as_dict=True) or {}
                    doc.append("geographies", {"branch": t["branch_code"], "zone": t["zone"], "region": t["region"], "district": _dgeo.district or ""})
                # Legacy sync handled in before_save, but set first for safety
                if doc.geographies:
                    doc.branch = doc.geographies[0].branch
                    doc.zone = doc.geographies[0].zone
                    doc.region = doc.geographies[0].region
                    doc.district = doc.geographies[0].district
                else:
                    doc.zone = t["zone"]
                    doc.region = t["region"]
                # No participant rows here — headcount lives in
                # number_of_participants; rows are added separately.
                doc.insert(ignore_permissions=True)
                created += 1
            except Exception as e:
                import traceback
                frappe.log_error(traceback.format_exc(), "Bulk Upload Training")
                _fd = from_date
                _fd_disp = f"{_fd[8:10]}/{_fd[5:7]}/{_fd[0:4]}" if len(_fd) == 10 else _fd
                errors.append(f"Training {t['program']} on {_fd_disp}: {str(e)}")

        # Build response
        msg = f"Created {created} trainings"
        if skipped:
            msg += f", Skipped {skipped} duplicates"
        if errors:
            msg += f", {len(errors)} errors"
        return {"success": True, "message": msg, "created": created, "skipped": skipped, "errors": errors, "total_groups": len(trainings)}
    except Exception as e:
        import traceback
        frappe.log_error(traceback.format_exc(), "Bulk Upload Training")
        return {"success": False, "message": _("Unexpected error: {0}").format(str(e))}


@frappe.whitelist()
def get_bulk_upload_template():
    # One row = one training. No participant rows — headcount goes in
    # "Number of Participants". Duration auto-sets To Date in the app.
    # Sample uses real program / SOL ID / trainer ID values from the system.
    header = ["S.No", "Training Date", "Program Name", "Branch Code", "Zone", "Region", "Trainer ID", "Training Type", "Training Days", "Program Duration in Hours", "Number of Participants"]
    sample = [
        ["1", "28/09/2026", "Training SK", "1000", "ZONE-1", "HO", "1754", "Classroom", "3", "6", "20"],
        ["2", "29/09/2026", "JLL Training", "1012", "ZONE-1", "REGION-1", "8751", "Virtual", "1", "2", "15"],
    ]
    import csv, io
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(header)
    w.writerows(sample)
    return out.getvalue()


@frappe.whitelist()
def get_branch_geo(branch):
    """Return zone / region / district for a Sahayog Branch (used by Add Training modal)."""
    if not branch:
        return {}
    geo = frappe.db.get_value(
        "Sahayog Branch", branch, ["zone", "region", "district"], as_dict=True
    )
    return geo or {}
