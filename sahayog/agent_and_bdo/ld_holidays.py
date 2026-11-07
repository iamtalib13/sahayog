"""Holiday rules for L&D trainings.

Single place for the rule so it stays identical everywhere it is enforced:

* ``Training.validate()`` -> create / save
* ``update_training_schedule()`` -> reschedule (uses ``db.set_value``, so it
  bypasses ``validate``)
* bulk training upload -> per-row trainer

Rule (confirmed with L&D):

* Sunday                       -> block
* trainer on holiday (any day) -> block
* *all* selected states on holiday for a date -> block
* *some* selected states on holiday           -> allow + warning
* unknown / missing data                      -> allow (never block on gaps)
"""

import frappe
from frappe import _
from frappe.utils import add_days, getdate, strip_html_tags


# ---------------------------------------------------------------------------
# small helpers
# ---------------------------------------------------------------------------

def _fmt(date):
    """User-facing DD/MM/YYYY (backend stays ISO)."""
    s = str(date)
    return f"{s[8:10]}/{s[5:7]}/{s[0:4]}"


def _cache():
    """Per-request cache so a multi-day range does not re-query the same rows."""
    if not hasattr(frappe.local, "_ld_holiday_cache"):
        frappe.local._ld_holiday_cache = {
            "states": {},   # (state_lower, year) -> Holiday List name / None
            "rows": {},     # (holiday_list, date) -> description / None
            "covers": {},   # holiday_list -> {from_date, to_date}
            "emp": {},      # (employee, year) -> Holiday List name / None
        }
    return frappe.local._ld_holiday_cache


_EMP_FIELDS = [
    "name",
    "employee_name",
    "holiday_list",
    "company",
    "sahayog_branch",
    "user_id",
]


def _get_employee(trainer=None):
    """Resolve a trainer hint to an Employee row.

    ``trainer`` may be an Employee ID, an employee_name (what Training.trainer
    stores) or a user id. Falls back to the session user's Employee.
    """
    if trainer:
        emp = frappe.db.get_value("Employee", trainer, _EMP_FIELDS, as_dict=True)
        if not emp:
            emp = frappe.db.get_value(
                "Employee", {"employee_name": trainer}, _EMP_FIELDS, as_dict=True
            )
        if not emp:
            emp = frappe.db.get_value(
                "Employee", {"user_id": trainer}, _EMP_FIELDS, as_dict=True
            )
        if emp:
            return emp

    user = getattr(frappe.session, "user", None)
    if user and user not in ("Guest", "Administrator"):
        return frappe.db.get_value(
            "Employee", {"user_id": user}, _EMP_FIELDS, as_dict=True
        )
    return None


def _list_covers(holiday_list, date):
    """True when the Holiday List's own date range includes ``date``.

    Guards against picking up a stale list (e.g. last year's) for an employee
    whose explicit ``holiday_list`` has not been updated yet.
    """
    cache = _cache()["covers"]
    if holiday_list not in cache:
        cache[holiday_list] = (
            frappe.db.get_value(
                "Holiday List", holiday_list, ["from_date", "to_date"], as_dict=True
            )
            or {}
        )
    row = cache[holiday_list]
    if not row.get("from_date") or not row.get("to_date"):
        return True
    return getdate(row["from_date"]) <= date <= getdate(row["to_date"])


def _state_holiday_list(state, year):
    """Find the state's Holiday List for ``year`` (case-insensitive)."""
    state = (state or "").strip()
    if not state:
        return None

    key = (state.lower(), year)
    cache = _cache()["states"]
    if key in cache:
        return cache[key]

    names = frappe.get_all(
        "Holiday List", filters={"name": ["like", f"%{year}"]}, pluck="name"
    )
    target = f"{state} - {year}".strip().lower()
    found = None
    for name in names:
        if name.strip().lower() == target:
            found = name
            break
    if not found:
        for name in names:
            if name.strip().lower().startswith(state.lower() + " -"):
                found = name
                break

    cache[key] = found
    return found


def _holiday_desc(holiday_list, date):
    """Holiday description for a date in a list, or None."""
    if not holiday_list:
        return None

    key = (holiday_list, str(date))
    cache = _cache()["rows"]
    if key in cache:
        return cache[key]

    rows = frappe.db.sql(
        "SELECT description FROM `tabHoliday` "
        "WHERE parent=%s AND holiday_date=%s LIMIT 1",
        (holiday_list, date),
        as_dict=True,
    )
    desc = None
    if rows:
        raw = rows[0].get("description") or ""
        desc = " ".join(strip_html_tags(raw).split()) or "Holiday"

    cache[key] = desc
    return desc


def _holiday_list_for_employee(emp, date):
    """Employee's own list -> branch state list -> company default."""
    key = (emp.get("name"), date.year)
    cache = _cache()["emp"]
    if key in cache:
        return cache[key]

    holiday_list = None
    own = emp.get("holiday_list")
    if own and frappe.db.exists("Holiday List", own) and _list_covers(own, date):
        holiday_list = own
    if not holiday_list and emp.get("sahayog_branch"):
        state = frappe.db.get_value("Sahayog Branch", emp["sahayog_branch"], "state")
        holiday_list = _state_holiday_list(state, date.year)
    if not holiday_list and emp.get("company"):
        holiday_list = frappe.db.get_value(
            "Company", emp["company"], "default_holiday_list"
        )

    cache[key] = holiday_list
    return holiday_list


def _states_from_branches(branches):
    """Unique branch states for the given branch ids/names."""
    states = []
    seen = set()
    for branch in branches or []:
        if not branch:
            continue
        state = frappe.db.get_value("Sahayog Branch", branch, "state")
        if not state:
            state = frappe.db.get_value("Sahayog Branch", {"branch": branch}, "state")
        state = (state or "").strip()
        if state and state.lower() not in seen:
            seen.add(state.lower())
            states.append(state)
    return states


# ---------------------------------------------------------------------------
# public API
# ---------------------------------------------------------------------------

def evaluate_training_holidays(trainer=None, from_date=None, to_date=None, branches=None):
    """Check a date range against the trainer and the selected branch states.

    Returns ``(block_message, warnings)``:
    * ``block_message`` is a string when the training must not be scheduled,
      else ``None``.
    * ``warnings`` is a list of strings for non-blocking state holidays.
    """
    if not from_date:
        return None, []

    start = getdate(from_date)
    end = getdate(to_date or from_date)
    if end < start:
        start, end = end, start

    emp = _get_employee(trainer)
    trainer_label = (
        (emp or {}).get("employee_name") or (trainer or "")
    ).strip() or _("Trainer")
    states = _states_from_branches(branches)

    warnings = []
    day = start
    while day <= end:
        disp = _fmt(day)

        if day.weekday() == 6:
            return (
                _("Training cannot be scheduled on Sunday: {0}").format(disp),
                warnings,
            )

        if emp:
            desc = _holiday_desc(_holiday_list_for_employee(emp, day), day)
            if desc:
                return (
                    _(
                        "Trainer {0} is on holiday on {1} ({2}); training cannot be scheduled."
                    ).format(trainer_label, disp, desc),
                    warnings,
                )

        if states:
            on_holiday = {}
            for state in states:
                desc = _holiday_desc(_state_holiday_list(state, day.year), day)
                if desc:
                    on_holiday[state] = desc

            if on_holiday and len(on_holiday) == len(states):
                return (
                    _(
                        "All selected branches are on holiday on {0} ({1}); "
                        "training cannot be scheduled."
                    ).format(disp, ", ".join(sorted(set(on_holiday.values())))),
                    warnings,
                )
            if on_holiday:
                warnings.append(
                    _(
                        "{0}: {1} on holiday ({2}). Participants from these "
                        "branches may not be available."
                    ).format(
                        disp,
                        ", ".join(sorted(on_holiday)),
                        ", ".join(sorted(set(on_holiday.values()))),
                    )
                )

        day = add_days(day, 1)

    if len(warnings) > 5:
        extra = len(warnings) - 5
        warnings = warnings[:5] + [_("…and {0} more day(s)").format(extra)]

    return None, warnings


def warnings_for_training(doc):
    """Convenience wrapper for a Training document (non-blocking warnings)."""
    branches = [row.branch for row in (doc.get("geographies") or []) if row.branch]
    if not branches and doc.get("branch"):
        branches = [doc.branch]
    _, warnings = evaluate_training_holidays(
        trainer=doc.get("trainer"),
        from_date=doc.get("from_date"),
        to_date=doc.get("to_date") or doc.get("from_date"),
        branches=branches,
    )
    return warnings
