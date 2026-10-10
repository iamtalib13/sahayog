# Copyright (c) 2026, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, getdate, today


def get_current_fy():
    """Financial year (Apr-Mar) in YYYY-YY format, e.g. 2026-27"""
    d = getdate(today())
    start = d.year if d.month >= 4 else d.year - 1
    return f"{start}-{str(start + 1)[-2:]}"


class COMVisitTracker(Document):
    def before_insert(self):
        if not self.year:
            self.year = get_current_fy()

    def validate(self):
        for row in self.get("com_visit_tracker") or []:
            month = (row.month or "").strip()

            if month:
                for fieldname, label in (
                    ("visti_start_date", "Visit Start Date"),
                    ("report_publish_date", "Report Publish Date"),
                ):
                    date_value = row.get(fieldname)
                    if date_value and getdate(date_value).strftime("%B").lower() != month.lower():
                        actual_month = getdate(date_value).strftime("%B")
                        frappe.throw(
                            frappe._(
                                "Row {0}: Month is {1}, but {2} is in {3}. "
                                "Please correct the date to match the selected month before saving."
                            ).format(row.idx, month, label, actual_month),
                            title=frappe._("Month Mismatch"),
                        )

            if (
                row.report_publish_date
                and row.report_closure_date
                and getdate(row.report_closure_date) < getdate(row.report_publish_date)
            ):
                frappe.throw(
                    frappe._("Row {0}: Report Closure Date cannot be earlier than Report Publish Date.").format(row.idx)
                )

    def on_update(self):
        try:
            sync_to_audit_and_compliance(self)
        except Exception:
            frappe.log_error(
                title=f"COM Visit Tracker sync failed [{self.name}]",
                message=frappe.get_traceback(),
            )

    def autoname(self):
        if not self.year:
            self.year = get_current_fy()
        b = frappe.db.get_value(
            "Sahayog Branch", self.sol_id,
            ["sol_id", "branch", "district"], as_dict=True,
        ) or {}
        parts = [
            str(b.get("sol_id") or self.sol_id),
            b.get("branch") or "",
            b.get("district") or "",
            self.year,
        ]
        self.name = "-".join(p.replace("/", "-").strip() for p in parts)


def create_yearly_trackers():
    """Naye saal ke liye: sirf un SOLs ke records jinka kisi COM ke Report Preference me access hai."""
    created = 0
    for name in frappe.get_all("Report Preference", filters={"enabled": 1}, pluck="name"):
        ensure_trackers_for_preference(frappe.get_doc("Report Preference", name))
    frappe.db.commit()
    return created


# Jin designations ko access milega (lowercase me likho)
COM_DESIGNATIONS = {"cluster operation manager"}


def is_com(user):
    """Sirf Cluster Operation Manager designation wale user ko access."""
    d = frappe.db.get_value("Employee", {"user_id": user}, "designation")
    return (d or "").strip().lower() in COM_DESIGNATIONS


def _is_admin(user):
    return user == "Administrator" or "System Manager" in frappe.get_roles(user)


def _get_scope(user):
    """Report Preference se zone/region/district/sol_id. None = koi access nahi."""
    if not is_com(user):
        return None
    if not frappe.db.exists("Report Preference", user):
        return None
    pref = frappe.get_doc("Report Preference", user)
    if not pref.enabled:
        return None

    def vals(table, field):
        return [str(r.get(field)) for r in (pref.get(table) or []) if r.get(field)]

    scope = {
        "geo": {
            "zone": vals("zone", "zone"),
            "region": vals("region", "region"),
            "state": vals("state", "state"),
            "district": vals("district", "district"),
        },
        "sol_ids": vals("sol_id", "sol_id"),
    }
    if pref.access_type == "Specific Branches (SOL ID)":
        scope["geo"] = {k: [] for k in scope["geo"]}
    else:
        scope["sol_ids"] = []
    return scope


def get_permission_query_conditions(user=None):
    user = user or frappe.session.user
    if _is_admin(user):
        return ""
    scope = _get_scope(user)
    if not scope:
        return "1=0"

    t = "`tabCOM Visit Tracker`"
    geo = [
        f"{t}.`{f}` in ({', '.join(frappe.db.escape(v) for v in vs)})"
        for f, vs in scope["geo"].items() if vs
    ]
    clauses = []
    if geo:
        clauses.append("(" + " and ".join(geo) + ")")
    if scope["sol_ids"]:
        in_sols = ", ".join(frappe.db.escape(v) for v in scope["sol_ids"])
        clauses.append(f"{t}.`sol_id` in ({in_sols})")
    return "(" + " or ".join(clauses) + ")" if clauses else "1=0"


def has_permission(doc, ptype=None, user=None, debug=False):
    user = user or frappe.session.user
    if _is_admin(user):
        return True
    scope = _get_scope(user)
    if not scope:
        return False
    if doc.get("sol_id") and str(doc.sol_id) in scope["sol_ids"]:
        return True
    geo = {f: vs for f, vs in scope["geo"].items() if vs}
    return bool(geo) and all(doc.get(f) in vs for f, vs in geo.items())


def get_scope_sols(pref):
    """Report Preference ke access se saare SOL (Zonal chhodke)."""
    base = [["branch_type", "!=", "Zonal"]]
    geo = {}
    for f in ("zone", "region", "state", "district"):
        vs = [r.get(f) for r in (pref.get(f) or []) if r.get(f)]
        if vs:
            geo[f] = vs
    sols = [str(r.sol_id) for r in (pref.get("sol_id") or []) if r.get("sol_id")]
    if pref.access_type == "Specific Branches (SOL ID)":
        geo = {}
    else:
        sols = []

    found = set()
    if geo:
        filters = base + [[f, "in", vs] for f, vs in geo.items()]
        found.update(frappe.get_all("Sahayog Branch", filters=filters, pluck="name"))
    if sols:
        filters = base + [["name", "in", sols]]
        found.update(frappe.get_all("Sahayog Branch", filters=filters, pluck="name"))
    return found


def ensure_trackers_for_preference(doc, method=None):
    """Report Preference save hote hi us user ke SOLs ke records bana do (jo nahi hain)."""
    if not doc.enabled or not is_com(doc.user):
        return
    year = get_current_fy()
    sols = get_scope_sols(doc)
    if not sols:
        return
    existing = set(frappe.get_all(
        "COM Visit Tracker",
        filters={"year": year, "sol_id": ["in", list(sols)]},
        pluck="sol_id",
    ))
    for sol in sols - existing:
        try:
            frappe.get_doc({
                "doctype": "COM Visit Tracker",
                "sol_id": sol,
                "year": year,
            }).insert(ignore_permissions=True)
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                f"COM Visit Tracker create failed: {sol}",
            )


def backfill_all_preferences():
    """Jo Report Preferences pehle se hain unke liye ek baar chalao."""
    for name in frappe.get_all("Report Preference", pluck="name"):
        ensure_trackers_for_preference(frappe.get_doc("Report Preference", name))
    frappe.db.commit()


# ---------------------------------------------------------------
# COM Visit Tracker -> Audit and Compliance (one way, no delete)
# ---------------------------------------------------------------
def _mkey(v):
    return (v or "").strip().lower()


def _find_month_row(rows, month):
    key = _mkey(month)
    for r in rows:
        if _mkey(r.month) == key:
            return r
    return None


def _apply(ac, table, month, values):
    """Sirf bhari hui values likho. True return karta hai agar kuch badla."""
    if not values:
        return False
    row = _find_month_row(ac.get(table) or [], month)
    if not row:
        ac.append(table, {"month": month, **values})
        return True
    changed = False
    for k, v in values.items():
        if str(row.get(k) or "") != str(v):
            row.set(k, v)
            changed = True
    return changed


_MONTHS = ["january", "february", "march", "april", "may", "june", "july",
           "august", "september", "october", "november", "december"]


def _row_year(date_val, month, fy_start):
    """A&C year = date ka calendar year. Date na ho to month se (Jan-Mar = FY start + 1)."""
    if date_val:
        return getdate(date_val).year
    m = (month or "").strip().lower()
    if m in _MONTHS:
        return fy_start + 1 if _MONTHS.index(m) < 3 else fy_start
    return fy_start


def sync_to_audit_and_compliance(doc):
    if not doc.sol_id or not doc.year:
        return
    try:
        fy_start = int(str(doc.year).split("-")[0].strip())
    except ValueError:
        frappe.throw(frappe._("Invalid year format: {0}").format(doc.year))

    work = {}
    for r in doc.get("com_visit_tracker") or []:
        month = (r.month or "").strip()
        if not month:
            continue
        visit, comp = {}, {}
        if r.visti_start_date:
            visit["date_of_visit"] = str(getdate(r.visti_start_date))
        if flt(r.score_obtain):
            visit["visit_score_i"] = str(flt(r.score_obtain))
        if r.report_publish_date:
            comp["date_of_publish"] = str(getdate(r.report_publish_date))
        if r.report_closure_date:
            comp["date_of_closure"] = str(getdate(r.report_closure_date))
        if visit:
            y = _row_year(r.visti_start_date, month, fy_start)
            work.setdefault(y, []).append((month, visit, {}))
        if comp:
            y = _row_year(r.report_publish_date or r.report_closure_date, month, fy_start)
            work.setdefault(y, []).append((month, {}, comp))

    for ac_year, items in work.items():
        _sync_one_year(doc, ac_year, items)


def _sync_one_year(doc, ac_year, items):
    name = frappe.db.get_value(
        "Audit and Compliance", {"sol_id": doc.sol_id, "year": ac_year}, "name"
    )
    if name:
        ac = frappe.get_doc("Audit and Compliance", name)
    else:
        branch = frappe.db.get_value("Sahayog Branch", doc.sol_id, "branch") or doc.branch_name or "Unknown"
        ac = frappe.get_doc({
            "doctype": "Audit and Compliance",
            "sol_id": doc.sol_id,
            "branch_name": branch,
            "year": ac_year,
        })

    changed = False
    for month, visit, comp in items:
        changed |= _apply(ac, "com_visit", month, visit)
        changed |= _apply(ac, "com_visit_compliance", month, comp)

    if not changed:
        return
    if name:
        ac.save(ignore_permissions=True)
    else:
        ac.insert(ignore_permissions=True)
    frappe.msgprint(
        frappe._("Audit and Compliance updated: {0}").format(ac.name),
        alert=True, indicator="green",
    )
