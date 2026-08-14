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
    if zone: filters["zone"] = zone
    if region: filters["region"] = region
    if district: filters["district"] = district
    if branch: filters["branch"] = branch

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

    participants = _participant_counts([r.name for r in rows])
    show_budget = _is_admin()

    out = []
    for r in rows:
        from_date = str(r.from_date or "")[:10]
        to_date = str(r.to_date or r.from_date or "")[:10]
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
    if zone:
        filters["zone"] = zone
    if region:
        filters["region"] = region
    if district:
        filters["district"] = district
    if branch:
        filters["branch"] = branch
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
    participants = _participant_counts([r.name for r in rows])
    show_budget = _is_admin()
    req_status = (status or "").strip().lower().replace(" ", "") or None

    out = []
    for r in rows:
        st = (r.status or get_training_status(r) or "").strip().lower().replace(" ", "")
        if req_status and st != req_status:
            continue
        from_date = str(r.from_date or "")[:10]
        to_date = str(r.to_date or r.from_date or "")[:10]
        out.append({
            "name": r.name,
            "from_date": from_date,
            "to_date": to_date,
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
    employees = frappe.db.get_all(
        "Training Participant",
        filters={"parent": name},
        fields=["employee", "employee_name", "attendance_status"],
        order_by="idx asc",
    )
    r["participant_list"] = employees
    r["participants"] = len(employees)
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
    if zone: filters["zone"] = zone
    if region: filters["region"] = region
    if district: filters["district"] = district
    if branch: filters["branch"] = branch

    rows = frappe.db.get_all(
        "Training", filters=filters, fields=["name", "from_date", "to_date", "docstatus", "status", *COMPLETION_FIELDS]
    )
    month_start = f"{year}-{month:02d}-01"
    rows = [r for r in rows if str(r.to_date or r.from_date or "")[:10] >= month_start]

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
    for emp in participants:
        if isinstance(emp, dict):
            emp = emp.get("employee") or emp.get("name")
        if emp:
            doc.append("participants", {"employee": emp})

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


@frappe.whitelist()
def get_mis_report(month, zone=None, region=None, district=None, branch=None):
    """Participant-level monthly report matching the MIS Excel format.

    One row per training participant (plus trainings with no participants yet).
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

    filters = {
        "docstatus": ["<", 2],
        "from_date": ["<=", end],
    }
    if zone:
        filters["zone"] = zone
    if region:
        filters["region"] = region
    if district:
        filters["district"] = district
    if branch:
        filters["branch"] = branch

    trainings = frappe.db.get_all(
        "Training",
        filters=filters,
        fields=["name", "training_program", "from_date", "to_date", "trainer"],
        order_by="from_date asc, start_time asc",
    )
    trainings = [
        t for t in trainings if str(t.to_date or t.from_date or "")[:10] >= start
    ]
    if not trainings:
        return {"columns": MIS_REPORT_COLUMNS, "rows": []}

    # Participants per training
    part_map = {}
    emp_ids = set()
    for t in trainings:
        parts = frappe.db.get_all(
            "Training Participant",
            filters={"parent": t.name, "parenttype": "Training"},
            fields=["employee", "employee_name"],
        )
        part_map[t.name] = parts
        for p in parts:
            if p.employee:
                emp_ids.add(p.employee)

    # Employee master data (guard custom columns in case migration is pending)
    emp_data = {}
    if emp_ids:
        emp_cols = _employee_columns()
        fields = ["name", "employee_name", "department", "designation",
                  "date_of_joining", "reports_to", "branch"]
        for extra in ("custom_division", "custom_zone", "sahayog_branch"):
            if extra in emp_cols:
                fields.append(extra)
        for e in frappe.db.get_all(
            "Employee",
            filters={"name": ["in", list(emp_ids)]},
            fields=fields,
            limit_page_length=0,
        ):
            emp_data[e.name] = e

    # Manager names
    mgr_ids = {e.reports_to for e in emp_data.values() if e.reports_to}
    mgr_names = {}
    if mgr_ids:
        for m in frappe.db.get_all(
            "Employee",
            filters={"name": ["in", list(mgr_ids)]},
            fields=["name", "employee_name"],
            limit_page_length=0,
        ):
            mgr_names[m.name] = m.employee_name or m.name

    # Branch display name + state
    branch_ids = {
        (getattr(e, "sahayog_branch", "") or "") for e in emp_data.values()
        if getattr(e, "sahayog_branch", "")
    }
    branch_meta = {}
    if branch_ids:
        for b in frappe.db.get_all(
            "Sahayog Branch",
            filters={"name": ["in", list(branch_ids)]},
            fields=["name", "branch", "state"],
            limit_page_length=0,
        ):
            branch_meta[b.name] = b

    # Trainer ID (trainer stores employee_name) — reverse lookup
    trainer_names = {t.trainer for t in trainings if t.trainer}
    trainer_ids = {}
    if trainer_names:
        for tr in frappe.db.get_all(
            "Employee",
            filters={"employee_name": ["in", list(trainer_names)]},
            fields=["employee_name", "name"],
            limit_page_length=0,
        ):
            trainer_ids[tr.employee_name] = tr.name

    rows = []
    seq = 0
    for t in trainings:
        parts = part_map.get(t.name) or []
        date_label = str(t.from_date or "")[:10]
        if t.to_date and str(t.to_date)[:10] != str(t.from_date or "")[:10]:
            date_label += " to " + str(t.to_date)[:10]
        base = {
            "training_date": date_label,
            "program_name": t.training_program or "",
            "trainer_name": t.trainer or "",
            "trainer_id": trainer_ids.get(t.trainer) or "",
        }
        if not parts:
            seq += 1
            row = {"s_no": seq, "emp_id": "", "name": "", "department": "",
                   "division": "", "designation": "", "date_of_joining": "",
                   "manager_id": "", "manager_name": "", "branch_name": "",
                   "state": "", "zone": ""}
            row.update(base)
            rows.append(row)
            continue
        for p in parts:
            seq += 1
            e = emp_data.get(p.employee)
            emp_branch_code = (getattr(e, "sahayog_branch", "") or "") if e else ""
            branch_meta_row = branch_meta.get(emp_branch_code) if emp_branch_code else None
            rows.append({
                "s_no": seq,
                "emp_id": (p.employee or "") or ((e.name or "") if e else ""),
                "name": (p.employee_name or "") or ((e.employee_name or "") if e else ""),
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
            } | base)
    return {"columns": MIS_REPORT_COLUMNS, "rows": rows}


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
