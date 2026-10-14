import json
import uuid

import frappe
from frappe.utils import now_datetime


TABLE_NAME = "tabSahayog Permanent Audit Log"


def ensure_audit_log_table():
    frappe.db.sql("""
        CREATE TABLE IF NOT EXISTS `tabSahayog Permanent Audit Log` (
            `name` VARCHAR(140) NOT NULL,
            `reference_doctype` VARCHAR(140) NOT NULL,
            `record_name` VARCHAR(255) NOT NULL,
            `sol_id` VARCHAR(140) DEFAULT NULL,
            `action` VARCHAR(30) NOT NULL,
            `user` VARCHAR(140) DEFAULT NULL,
            `event_time` DATETIME(6) NOT NULL,
            `source` VARCHAR(30) DEFAULT 'Manual',
            `reason` TEXT DEFAULT NULL,
            `data` LONGTEXT,
            PRIMARY KEY (`name`),
            KEY `idx_record` (`reference_doctype`, `record_name`),
            KEY `idx_event_time` (`event_time`)
        ) ENGINE=InnoDB
    """)


def write_audit_log(
    doc,
    action,
    data=None,
    source=None,
    reason=None,
):

    source = (
        source
        or getattr(frappe.flags, "sahayog_audit_source", None)
        or "Manual"
    )

    frappe.db.sql(
        f"""
        INSERT INTO `{TABLE_NAME}` (
            name, reference_doctype, record_name, sol_id,
            action, user, event_time, source, reason, data
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            str(uuid.uuid4()),
            doc.doctype,
            doc.name,
            doc.get("sol_id"),
            action,
            frappe.session.user,
            now_datetime(),
            source,
            reason,
            json.dumps(data or {}, default=str),
        ),
    )


def get_audit_logs(doctype, record_name=None):

    filters = [doctype]
    condition = "reference_doctype = %s"

    if record_name:
        condition += " AND record_name = %s"
        filters.append(record_name)

    rows = frappe.db.sql(
        f"""
        SELECT reference_doctype, record_name, sol_id, action,
               user, event_time, source, reason, data
        FROM `{TABLE_NAME}`
        WHERE {condition}
        ORDER BY event_time ASC
        """,
        tuple(filters),
        as_dict=True,
    )

    for row in rows:
        try:
            row.data = json.loads(row.data or "{}")
        except (TypeError, ValueError):
            row.data = {}

    return rows



def snapshot_document(doc):
    excluded = {
        "doctype", "owner", "creation", "modified", "modified_by",
        "parent", "parentfield", "parenttype", "idx", "docstatus",
        "__unsaved",
    }

    def clean(value):
        if isinstance(value, dict):
            return {
                key: clean(item)
                for key, item in value.items()
                if key not in excluded
            }
        if isinstance(value, (list, tuple)):
            return [clean(item) for item in value]
        return value

    return clean(doc.as_dict())


def get_latest_version_data(doc):
    rows = frappe.get_all(
        "Version",
        filters={
            "ref_doctype": doc.doctype,
            "docname": doc.name,
        },
        fields=["data"],
        order_by="creation desc",
        limit_page_length=1,
    )

    if not rows or not rows[0].get("data"):
        return {}

    try:
        return json.loads(rows[0].data)
    except (TypeError, ValueError):
        return {}


def get_deleted_record_audit_logs(doctype):
    """Return permanent history only for records with a recorded deletion."""
    rows = get_audit_logs(doctype)
    deleted_names = {
        row.record_name
        for row in rows
        if row.action == "Deleted"
    }
    return [
        row for row in rows
        if row.record_name in deleted_names
    ]


# ---------------- Permanent audit display + source helpers ----------------
from contextlib import contextmanager
from functools import wraps

_DETAIL_SKIP = {
    "name", "doctype", "owner", "creation", "modified", "modified_by",
    "parent", "parentfield", "parenttype", "idx", "docstatus", "__unsaved",
}


def _show(value):
    return "(empty)" if value in (None, "") else str(value)


def _fields_text(values):
    return ", ".join(
        f"{key}: {_show(val)}"
        for key, val in (values or {}).items()
        if key not in _DETAIL_SKIP and not isinstance(val, (list, dict))
    )


def _child_rows_text(values):
    parts = []
    for table, rows in (values or {}).items():
        if table in _DETAIL_SKIP or not isinstance(rows, list) or not rows:
            continue
        rendered = "; ".join(
            f"[{i}] {_fields_text(row)}"
            for i, row in enumerate(rows, 1)
            if isinstance(row, dict)
        )
        parts.append(f"{table} ({len(rows)} rows) -> {rendered}")
    return parts


def _version_text(changed):
    parts = []
    try:
        for field, old, new in changed.get("changed", []):
            parts.append(f"{field}: {_show(old)} -> {_show(new)}")
        for table, row in changed.get("added", []):
            parts.append(f"Row added in {table}: {_fields_text(row)}")
        for table, row in changed.get("removed", []):
            parts.append(f"Row removed from {table}: {_fields_text(row)}")
        for table, idx, _name, changes in changed.get("row_changed", []):
            for field, old, new in changes:
                parts.append(f"{table} row {idx} {field}: {_show(old)} -> {_show(new)}")
    except (AttributeError, TypeError, ValueError):
        return []
    return parts


def audit_details(audit):
    """Readable one-line text for a permanent audit row (Logs page + Excel)."""
    data = audit.get("data") or {}
    action = audit.get("action")

    lines = []
    if audit.get("sol_id"):
        lines.append(f"SOL ID: {audit.get('sol_id')}")
    lines.append(f"Source: {audit.get('source') or 'Manual'}")
    if audit.get("reason"):
        lines.append(f"Reason: {audit.get('reason')}")

    if action in ("Deleted", "Created"):
        key = "deleted" if action == "Deleted" else "created"
        label = "Old values" if action == "Deleted" else "New values"
        snap = data.get(key) or {}
        lines.append(f"{label}: " + (_fields_text(snap) or "(none)"))
        lines.extend(_child_rows_text(snap))
    elif action == "Updated":
        changes = _version_text(data.get("changed"))
        lines.append("Changes: " + ("; ".join(changes) if changes else "(not captured)"))

    return " | ".join(lines)


@contextmanager
def audit_source(source):
    previous = getattr(frappe.flags, "sahayog_audit_source", None)
    frappe.flags.sahayog_audit_source = source
    try:
        yield
    finally:
        frappe.flags.sahayog_audit_source = previous


def excel_upload_source(fn):
    """Decorator: everything saved inside fn is logged as 'Excel Upload'."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        with audit_source("Excel Upload"):
            return fn(*args, **kwargs)
    return wrapper


# ================= Readable audit rendering (web + excel) =================
from html import escape as _html_escape


def _esc(value):
    return _html_escape(str(value))

_HIDE = _DETAIL_SKIP | {"scheme_code_options", "data_import", "updater_reference"}


def _pretty(name):
    return (name or "").replace("_", " ").title()


def _label(doctype, fieldname):
    try:
        label = frappe.get_meta(doctype).get_label(fieldname)
        if label:
            return label
    except Exception:
        pass
    return _pretty(fieldname)


def _child_doctype(doctype, table):
    try:
        df = frappe.get_meta(doctype).get_field(table)
        return df.options if df else None
    except Exception:
        return None


def _val(value):
    return "-" if value in (None, "") else str(value)


def _same(a, b):
    if _val(a) == _val(b):
        return True
    try:
        return float(a) == float(b)
    except (TypeError, ValueError):
        return False


def _row_pairs(doctype, row):
    return [
        (_label(doctype, key), _val(value))
        for key, value in (row or {}).items()
        if key not in _HIDE
        and value not in (None, "")
        and not isinstance(value, (list, dict))
    ]


def _sections(audit):
    dt = audit.get("reference_doctype")
    data = audit.get("data") or {}
    action = audit.get("action")

    if action in ("Created", "Deleted"):
        snap = data.get("deleted" if action == "Deleted" else "created") or {}
        tables = []
        for table, rows in snap.items():
            if table in _HIDE or not isinstance(rows, list) or not rows:
                continue
            cdt = _child_doctype(dt, table)
            tables.append((
                _label(dt, table),
                [_row_pairs(cdt, r) for r in rows if isinstance(r, dict)],
            ))
        return {"action": action, "fields": _row_pairs(dt, snap), "tables": tables}

    changed = data.get("changed") or {}
    items = []
    try:
        for field, old, new in changed.get("changed", []):
            if not _same(old, new):
                items.append(("edit", _label(dt, field), _val(old), _val(new)))
        for table, row in changed.get("added", []):
            items.append(("add", _label(dt, table), _row_pairs(_child_doctype(dt, table), row)))
        for table, row in changed.get("removed", []):
            items.append(("remove", _label(dt, table), _row_pairs(_child_doctype(dt, table), row)))
        for table, idx, _name, changes in changed.get("row_changed", []):
            cdt = _child_doctype(dt, table)
            for field, old, new in changes:
                if not _same(old, new):
                    items.append((
                        "rowedit", _label(dt, table), idx,
                        _label(cdt, field), _val(old), _val(new),
                    ))
    except (AttributeError, TypeError, ValueError):
        pass
    return {"action": action, "items": items}


def _pairs_text(pairs):
    return ", ".join(f"{label}: {value}" for label, value in pairs)


def _item_text(it):
    kind = it[0]
    if kind == "edit":
        return f"- {it[1]} changed: {it[2]} -> {it[3]}"
    if kind == "add":
        return f"- Row added in {it[1]}: {_pairs_text(it[2])}"
    if kind == "remove":
        return f"- Row removed from {it[1]}: {_pairs_text(it[2])}"
    return f"- {it[1]} (row {it[2]}) {it[3]} changed: {it[4]} -> {it[5]}"


def audit_details_text(audit):
    """Plain multi-line text (used for Excel export)."""
    sec = _sections(audit)
    head = []
    if audit.get("sol_id"):
        head.append(f"SOL ID: {audit.get('sol_id')}")
    head.append(f"Source: {audit.get('source') or 'Manual'}")
    if audit.get("reason"):
        head.append(f"Reason: {audit.get('reason')}")
    lines = [" | ".join(head)]

    if "items" in sec:
        if not sec["items"]:
            lines.append("No field-level change captured in this save")
        lines.extend(_item_text(it) for it in sec["items"])
    else:
        title = "Old values (before delete)" if sec["action"] == "Deleted" else "New values"
        lines.append(f"{title}: {_pairs_text(sec['fields']) or '-'}")
        for tname, rows in sec["tables"]:
            lines.append(f"{tname} ({len(rows)} rows):")
            for i, row in enumerate(rows, 1):
                lines.append(f"  {i}. {_pairs_text(row)}")
    return "\n".join(lines)


def _chip(text, bg, fg):
    return (
        "<span style='display:inline-block;padding:0 8px;margin-right:6px;"
        f"border-radius:10px;font-size:11px;font-weight:600;background:{bg};color:{fg}'>"
        f"{text}</span>"
    )


def _pairs_html(pairs):
    return " &middot; ".join(
        f"<span style='color:#8a94a0'>{_esc(l)}:</span> <b>{_esc(v)}</b>"
        for l, v in pairs
    ) or "<span style='color:#8a94a0'>(no values)</span>"


def _old_new_html(old, new):
    return (
        f"<span style='color:#b42318;text-decoration:line-through'>{_esc(old)}</span>"
        f" &rarr; <span style='color:#067647;font-weight:600'>{_esc(new)}</span>"
    )


def _item_html(it):
    kind = it[0]
    if kind == "edit":
        body = f"<b>{_esc(it[1])}</b>: {_old_new_html(it[2], it[3])}"
        chip = _chip("Changed", "#e8f0fe", "#1a56db")
    elif kind == "add":
        body = f"<b>{_esc(it[1])}</b> &ndash; new row: {_pairs_html(it[2])}"
        chip = _chip("Added", "#e6f4ea", "#067647")
    elif kind == "remove":
        body = f"<b>{_esc(it[1])}</b> &ndash; row deleted: {_pairs_html(it[2])}"
        chip = _chip("Removed", "#fde8e8", "#b42318")
    else:
        body = (
            f"<b>{_esc(it[1])}</b> (row {_esc(it[2])}) &ndash; "
            f"{_esc(it[3])}: {_old_new_html(it[4], it[5])}"
        )
        chip = _chip("Changed", "#e8f0fe", "#1a56db")
    return f"<div style='margin:3px 0;line-height:1.6'>{chip}{body}</div>"


def _table_html(rows):
    cols = []
    for row in rows:
        for label, _ in row:
            if label not in cols:
                cols.append(label)
    th = "".join(
        f"<th style='text-align:left;padding:2px 10px;border-bottom:1px solid #e4e7eb;"
        f"color:#8a94a0;font-weight:600'>{_esc(c)}</th>" for c in cols
    )
    body = ""
    for row in rows:
        lookup = dict(row)
        body += "<tr>" + "".join(
            f"<td style='padding:2px 10px'>{_esc(lookup.get(c, '-'))}</td>" for c in cols
        ) + "</tr>"
    return (
        "<div style='overflow-x:auto'><table style='border-collapse:collapse;"
        f"font-size:12px;margin:2px 0 6px'><tr>{th}</tr>{body}</table></div>"
    )


def audit_details_html(audit):
    """Readable HTML block (used on the Logs page)."""
    sec = _sections(audit)
    if "items" in sec:
        if not sec["items"]:
            return "<span style='color:#8a94a0'>Saved &ndash; no field-level change captured</span>"
        return "".join(_item_html(it) for it in sec["items"])

    title = (
        "Record deleted. Values before deletion:"
        if sec["action"] == "Deleted" else "Record created with:"
    )
    out = f"<div style='font-weight:600;margin-bottom:3px'>{title}</div>"
    out += f"<div style='margin-bottom:4px'>{_pairs_html(sec['fields'])}</div>"
    for tname, rows in sec["tables"]:
        out += f"<div style='margin-top:4px'><b>{_esc(tname)}</b> ({len(rows)} rows)</div>"
        out += _table_html(rows)
    return out
