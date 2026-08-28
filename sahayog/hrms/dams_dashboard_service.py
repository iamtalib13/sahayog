import frappe
from frappe import _

CASE_DOCTYPES = ["Disciplinary Case", "Unauthorized Absence"]

STATUS_LABELS = {
    "under_process": "Under Process",
    "closed": "Closed",
    "draft": "Draft",
}


def _get_type_stats(doctype):
    """Per-doctype status breakdown, excluding cancelled (docstatus=2)."""
    rows = frappe.get_all(
        doctype,
        filters={"docstatus": ("!=", 2)},
        fields=["status", "count(name) as cnt"],
        group_by="status",
    )
    stats = {"total": 0, "under_process": 0, "closed": 0, "draft": 0}
    for r in rows:
        stats["total"] += r.cnt
        if r.status == "Under Process":
            stats["under_process"] = r.cnt
        elif r.status == "Closed":
            stats["closed"] = r.cnt
        elif r.status == "Draft":
            stats["draft"] = r.cnt
    return stats


@frappe.whitelist()
def get_dams_dashboard_stats(months=12):
    """Live stats for DAMS dashboard block.

    Returns combined overview (DC + UA), per-type distribution
    and month-wise trend based on issue_occurrence_date.
    """
    months = int(months) if months else 12

    dc_stats = _get_type_stats("Disciplinary Case")
    ua_stats = _get_type_stats("Unauthorized Absence")

    overview = {
        key: dc_stats[key] + ua_stats[key]
        for key in ("total", "under_process", "closed", "draft")
    }

    # Month-wise trend for last N months (excluding cancelled)
    month_wise = {}
    for doctype, prefix in (("Disciplinary Case", "dc"), ("Unauthorized Absence", "ua")):
        rows = frappe.db.sql(
            f"""
            SELECT DATE_FORMAT(issue_occurrence_date, '%%Y-%%m') as ym,
                   COUNT(name) as cnt
            FROM `tab{doctype}`
            WHERE docstatus != 2
              AND issue_occurrence_date IS NOT NULL
              AND issue_occurrence_date >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
            GROUP BY ym
            """,
            (months,),
            as_dict=True,
        )
        for r in rows:
            month_wise.setdefault(r.ym, {"dc": 0, "ua": 0})[prefix] = r.cnt

    trend = [
        {"month": ym, "label": frappe.utils.formatdate(ym + "-01", "MMM yyyy"), **vals}
        for ym, vals in sorted(month_wise.items())
    ]

    return {
        "overview": overview,
        "by_type": {
            "disciplinary": dc_stats,
            "unauthorized_absence": ua_stats,
        },
        "month_wise": trend,
    }
