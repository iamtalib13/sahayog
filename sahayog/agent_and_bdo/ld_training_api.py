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
