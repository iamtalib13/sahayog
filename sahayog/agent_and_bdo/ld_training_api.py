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
    "trainer", "training_location", "zone", "region", "district", "branch",
    "is_adhoc", "docstatus", "status", "trainer_remarks",
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


def _owner_scope():
    """Non-admin trainers only see trainings they created (all others see all)."""
    if _is_admin() or not _is_trainer():
        return {}
    return {"owner": frappe.session.user}


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
    return {
        "user": frappe.session.user,
        "is_ld_admin": _is_admin(),
        "is_ld_trainer": _is_trainer(),
        "is_ld_viewer": "L&D Viewer" in roles,
        "employee": employee or {},
        "roles": roles,
    }


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
    filters.update(_owner_scope())

    rows = frappe.db.get_all(
        "Training",
        filters=filters,
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
    show_budget = _is_admin()

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
            "zone": r.zone or "",
            "region": r.region or "",
            "district": r.district or "",
            "branch": r.branch or "",
            "geographies": geos,
            "branches": branches,
            "participants": participants.get(r.name, 0),
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
    filters.update(_owner_scope())
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
    show_budget = _is_admin()
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
            "zone": r.zone or "",
            "region": r.region or "",
            "district": r.district or "",
            "branch": r.branch or "",
            "geographies": geos,
            "branches": branches,
            "participants": participants.get(r.name, 0),
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
        owner = frappe.db.get_value("Training", name, "owner")
        if owner != frappe.session.user:
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
        fields=["reference_doctype", "agent_employee", "full_name", "attendance_status"],
        order_by="idx asc",
    )
    r["participant_list"] = participants_list
    r["participants"] = len(participants_list)
    if not _is_admin():
        r["budget_amount"] = None
        r["actual_expense"] = None
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
    filters.update(_owner_scope())

    rows = frappe.db.get_all(
        "Training", filters=filters, fields=["name", "from_date", "to_date", "docstatus", "status", *COMPLETION_FIELDS, "zone", "region", "district", "branch"]
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
    Pass `submit=1` to submit it immediately so it shows on the calendar.

    Geography: accepts either single legacy fields (branch/zone/region/district)
    or new `geographies` param (JSON list of {branch} or branch codes). When
    geographies is provided, each branch's zone/region/district is auto-filled.
    """
    _require_can_write()

    allowed = {
        "training_program", "is_adhoc", "from_date", "to_date", "start_time", "end_time",
        "trainer", "training_location", "zone", "region", "district", "branch",
        "trainer_remarks", "training_delivered", "attendance_marked",
        "pre_assessment_taken", "post_assessment_taken", "feedback_taken",
    }
    submit = int(kwargs.get("submit") or 1) == 1
    participants = frappe.parse_json(kwargs.get("participants") or "[]")
    geographies = frappe.parse_json(kwargs.get("geographies") or "[]")

    doc = frappe.new_doc("Training")
    for field in allowed:
        if kwargs.get(field) not in (None, ""):
            doc.set(field, kwargs[field])
    if doc.start_time:
        doc.start_time = _normalize_time(doc.start_time)
    if doc.end_time:
        doc.end_time = _normalize_time(doc.end_time)
    # If end_time was not provided, clear it so validate() doesn't compare against a stale/default value
    if not kwargs.get("end_time"):
        doc.end_time = None
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
    if submit:
        doc.submit()
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
def update_budget(training_name, budget_amount=None, actual_expense=None):
    """L&D Admin only — budget/expense capture."""
    if not _is_admin():
        frappe.throw("Only L&D Admin can update budget/expenses.")
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
    {"key": "training_date", "label": "Training Date"},
    {"key": "program_name", "label": "Program Name"},
    {"key": "trainer_name", "label": "Trainer Name"},
    {"key": "trainer_id", "label": "Trainer ID"},
]


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
              "date_of_joining", "reports_to", "branch"]
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
    if not _is_admin():
        frappe.throw(_("Only L&D Admin can generate this report."))
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
            "t.trainer, p.idx, p.reference_doctype, p.agent_employee, p.full_name "
            + base
            + " ORDER BY t.from_date ASC, t.start_time ASC, p.idx ASC "
            "LIMIT %(page_size)s OFFSET %(offset)s",
            page_params,
            as_dict=True,
        )
    else:
        rows = frappe.db.sql(
            "SELECT t.name AS training_name, t.training_program, t.from_date, t.to_date, "
            "t.trainer, p.idx, p.reference_doctype, p.agent_employee, p.full_name "
            + base
            + " ORDER BY t.from_date ASC, t.start_time ASC, p.idx ASC",
            params,
            as_dict=True,
        )

    if not rows:
        return {"columns": MIS_REPORT_COLUMNS, "rows": [], "total": 0}

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
        date_label = str(r.from_date or "")[:10]
        if r.to_date and str(r.to_date)[:10] != str(r.from_date or "")[:10]:
            date_label += " to " + str(r.to_date)[:10]
        display_name = r.full_name or (e.employee_name if e else "") or r.agent_employee or ""
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
            "training_date": date_label,
            "program_name": r.training_program or "",
            "trainer_name": r.trainer or "",
            "trainer_id": trainer_ids.get(r.trainer) or "",
        })
    return {"columns": MIS_REPORT_COLUMNS, "rows": out, "total": total}


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
    if not _is_admin():
        frappe.throw(_("Only L&D Admin can generate this report."))

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


@frappe.whitelist()
def get_trainer_options(enabled_only=True):
    """Active employees to pick as trainer in the Add Training form."""
    filters = {}
    if enabled_only:
        filters["status"] = "Active"
    return frappe.db.get_all(
        "Employee",
        filters=filters,
        fields=["name", "employee_name", "sahayog_branch"],
        order_by="employee_name asc",
        limit_page_length=0,
    )


@frappe.whitelist()
def get_agent_options(enabled_only=True):
    """Active agents to pick as participants in the Add Training form."""
    filters = {}
    if enabled_only:
        filters["agent_status"] = "Active"
    return frappe.db.get_all(
        "Agent",
        filters=filters,
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
    employee_name = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
    is_owner = doc.owner == frappe.session.user or doc.trainer == employee_name
    if not is_owner:
        frappe.throw("You don't have permission to update this training's status.")


@frappe.whitelist()
def get_branch_geo(branch):
    """Return zone / region / district for a Sahayog Branch (used by Add Training modal)."""
    if not branch:
        return {}
    geo = frappe.db.get_value(
        "Sahayog Branch", branch, ["zone", "region", "district"], as_dict=True
    )
    return geo or {}
