import json
import frappe
from frappe.utils import flt, add_days, nowdate, cint


def check_rate_limit(action, max_calls=30, per_seconds=60):
    """Per-user rate limiter using frappe.cache().
    Returns True if allowed, False if rate limit exceeded."""
    user = frappe.session.user
    cache_key = f"crm_ratelimit:{user}:{action}"
    current = frappe.cache().get_value(cache_key)

    if current is None:
        frappe.cache().set_value(cache_key, 1, expires_in_sec=per_seconds)
        return True

    if cint(current) >= max_calls:
        return False

    frappe.cache().set_value(cache_key, cint(current) + 1, expires_in_sec=per_seconds)
    return True


@frappe.whitelist()
def get_crm_data(section: str, limit: int = 20, cursor: str = "0", search_term: str = None, since: str = None):
    """CRM data fetching with server-side cache (60s TTL) + rate limiting + incremental sync."""
    if not check_rate_limit("get_crm_data", max_calls=30, per_seconds=60):
        frappe.throw(title="Too Many Requests", msg="Rate limit exceeded. Please slow down.", http_status=429)

    limit = frappe.parse_json(limit) or 20
    offset = int(cursor) if cursor and str(cursor).isdigit() else 0

    # Incremental sync: skip cache jab since ho (fresh data chahiye)
    if not since:
        cache_key = f"crm_data:{frappe.session.user}:{section}:{limit}:{offset}:{search_term}"
        cached = frappe.cache().get_value(cache_key)
        if cached:
            return cached

    response = {
        "data": [],
        "next_cursor": None,
        "total_count": 0,
        "lead_count": 0,
        "appointment_count": 0,
        "last_modified": since,
    }

    if section == "lead":
        data, next_cursor, total = _get_lead_data(limit, offset, search_term, since=since)
        response.update({
            "data": data,
            "next_cursor": next_cursor,
            "total_count": total,
            "lead_count": total,
            "last_modified": data[-1].get("modified") if data else since,
        })

    elif section == "appointment":
        data, next_cursor, total = _get_appointment_data(limit, offset, search_term, since=since)
        response.update({
            "data": data,
            "next_cursor": next_cursor,
            "total_count": total,
            "appointment_count": total,
            "last_modified": data[-1].get("modified") if data else since,
        })

    if not since:
        frappe.cache().set_value(cache_key, response, expires_in_sec=60)
    return response

def _get_lead_data(limit, offset, search_term, since=None):
    user = frappe.session.user

    filters = [["lead_owner", "=", user]]
    or_filters = []

    if since:
        filters.append(["modified", ">", since])

    if search_term:
        term = f"%{search_term}%"
        or_filters = [
            ["lead_name", "like", term],
            ["mobile_no", "like", term],
            ["first_name", "like", term],
            ["email_id", "like", term]
        ]

    count_filters = list(filters)
    if or_filters:
        count_filters.insert(0, ["_or"] + or_filters)

    # Cache total_count separately (120s TTL) — only when no search/since for accurate count
    count_cache_key = None
    if not since and not search_term:
        count_cache_key = f"crm_count:{user}"
        total_count = frappe.cache().get_value(count_cache_key)
        if total_count is None:
            total_count = frappe.db.count("Lead", filters=count_filters)
            frappe.cache().set_value(count_cache_key, total_count, expires_in_sec=120)
    else:
        total_count = frappe.db.count("Lead", filters=count_filters)

    leads = frappe.get_list(
        "Lead",
        fields=["name", "lead_name", "first_name", "mobile_no", "email_id", "status", "source", "modified"],
        filters=filters,
        or_filters=or_filters,
        order_by="modified desc, name desc",
        limit_start=offset,
        limit_page_length=limit + 1
    )

    next_cursor = str(offset + limit) if len(leads) > limit else None
    if len(leads) > limit:
        leads.pop()

    if not leads:
        return [], None, 0

    lead_names = [d.get("name") for d in leads]

    amounts = frappe.get_all(
        "Lead Product",
        fields=["parent", "SUM(product_amount) as total"],
        filters={"parent": ["in", lead_names]},
        group_by="parent"
    )

    amount_map = {d.parent: flt(d.total) for d in amounts}
    for lead in leads:
        lead["totalAmount"] = amount_map.get(lead.get("name"), 0)

    return leads, next_cursor, total_count


def _get_appointment_data(limit, offset, search_term, since=None):
    user = frappe.session.user
    filters = [["owner", "=", user]]
    or_filters = []

    if since:
        filters.append(["modified", ">", since])

    if search_term:
        term = f"%{search_term}%"
        or_filters = [
            ["customer_name", "like", term],
            ["customer_phone_number", "like", term]
        ]

    count_filters = list(filters)
    if or_filters:
        count_filters.insert(0, ["_or"] + or_filters)

    # Cache total_count separately (120s TTL) — only when no search/since for accurate count
    if not since and not search_term:
        count_cache_key = f"crm_appt_count:{user}"
        total_count = frappe.cache().get_value(count_cache_key)
        if total_count is None:
            total_count = frappe.db.count("Appointment", filters=count_filters)
            frappe.cache().set_value(count_cache_key, total_count, expires_in_sec=120)
    else:
        total_count = frappe.db.count("Appointment", filters=count_filters)

    appointments = frappe.get_list(
        "Appointment",
        fields=["name", "customer_name", "customer_phone_number", "customer_email", "customer_details", "scheduled_time", "status", "party", "modified"],
        filters=filters,
        or_filters=or_filters,
        order_by="modified desc, name desc",
        limit_start=offset,
        limit_page_length=limit + 1
    )

    next_cursor = str(offset + limit) if len(appointments) > limit else None
    if len(appointments) > limit:
        appointments.pop()

    return appointments, next_cursor, total_count


def invalidate_crm_cache(user=None):
    """Invalidate all CRM data cache for a user."""
    user = user or frappe.session.user
    for key in frappe.cache().get_keys(f"crm_data:{user}:*") or []:
        frappe.cache().delete_key(key)
    frappe.cache().delete_key(f"crm_count:{user}")
    frappe.cache().delete_key(f"crm_appt_count:{user}")
