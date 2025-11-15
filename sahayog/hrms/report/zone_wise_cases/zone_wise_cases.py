# import frappe
# # execute function for Zone Wise Cases report
# def execute(filters=None):
#     """
#     Zone Wise Cases — stacked region chart, clickable colored counts, correct totals.
#     Access: Administrator + HR SUPPORT EXECUTIVE + HR SUPPORT MANAGER
#     """

#     if not filters:
#         filters = {}

#     # -------------------- Access control --------------------
#     allowed_roles = {"HR Support Executive", "HR Support Manager"}
#     user_roles = set(frappe.get_roles(frappe.session.user))
#     if frappe.session.user != "Administrator" and allowed_roles.isdisjoint(user_roles):
#         frappe.throw("You are not permitted to view this report.")

#     # -------------------- Filters --------------------
#     from_date = filters.get("from_date")
#     to_date = filters.get("to_date")
#     case_status = filters.get("case_status")  # optional: Draft/Under Process/Closed
#     zone_filter = filters.get("zone")  # optional

#     conditions = []
#     if from_date:
#         conditions.append(f"dc.issue_occurrence_date >= '{from_date}'")
#     if to_date:
#         conditions.append(f"dc.issue_occurrence_date <= '{to_date}'")
#     if case_status:
#         conditions.append(f"dc.status = '{case_status}'")
#     if zone_filter:
#         conditions.append(f"dc.zone = '{zone_filter}'")

#     where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

#     # -------------------- Query --------------------
#     # Get counts per (zone, region) for the 3 statuses we care about
#     query = f"""
#         SELECT
#             IFNULL(NULLIF(TRIM(dc.zone), ''), 'Other') AS zone,
#             IFNULL(NULLIF(TRIM(dc.region), ''), 'Other') AS region,
#             SUM(CASE WHEN dc.status = 'Draft' THEN 1 ELSE 0 END) AS draft_count,
#             SUM(CASE WHEN dc.status = 'Under Process' THEN 1 ELSE 0 END) AS under_process_count,
#             SUM(CASE WHEN dc.status = 'Closed' THEN 1 ELSE 0 END) AS closed_count
#         FROM `tabDisciplinary Case` dc
#         {where_clause}
#         GROUP BY IFNULL(NULLIF(TRIM(dc.zone), ''), 'Other'),
#                  IFNULL(NULLIF(TRIM(dc.region), ''), 'Other')
#     """

#     raw = frappe.db.sql(query, as_dict=True)

#     # -------------------- Aggregate by zone --------------------
#     zone_map = {}
#     for r in raw:
#         zone = r.get("zone") or "Other"
#         region = r.get("region") or "Other"

#         if zone not in zone_map:
#             zone_map[zone] = {
#                 "zone": zone,
#                 "draft_count": 0,
#                 "under_process_count": 0,
#                 "closed_count": 0,
#                 "total_cases": 0,   # sum of the three statuses
#                 "regions": {}       # region -> total (sum of three statuses) for stacking
#             }

#         draft = int(r.get("draft_count") or 0)
#         under = int(r.get("under_process_count") or 0)
#         closed = int(r.get("closed_count") or 0)

#         zone_map[zone]["draft_count"] += draft
#         zone_map[zone]["under_process_count"] += under
#         zone_map[zone]["closed_count"] += closed
#         zone_map[zone]["total_cases"] += (draft + under + closed)

#         # region total as sum of statuses
#         zone_map[zone]["regions"][region] = zone_map[zone]["regions"].get(region, 0) + (draft + under + closed)

#     # Convert to list and sort by under_process_count desc
#     data = list(zone_map.values())
#     data.sort(key=lambda x: x["under_process_count"], reverse=True)

#     # -------------------- Summary --------------------
#     total_draft = sum(d["draft_count"] for d in data)
#     total_under = sum(d["under_process_count"] for d in data)
#     total_closed = sum(d["closed_count"] for d in data)
#     total_cases = sum(d["total_cases"] for d in data)

#     report_summary = [
#         {"label": "Total Cases", "value": total_cases, "indicator": "Blue"},
#         {"label": "Draft", "value": total_draft, "indicator": "Gray"},
#         {"label": "Under Process", "value": total_under, "indicator": "Red"},
#         {"label": "Closed", "value": total_closed, "indicator": "Green"},
#     ]

#     # -------------------- Chart (stacked by region inside each zone) --------------------
#     chart = None
#     if data:
#         zones = [d["zone"] for d in data]

#         # list unique regions across all zones
#         region_set = set()
#         for d in data:
#             region_set.update(d["regions"].keys())
#         regions = sorted(region_set)

#         datasets = []
#         for region in regions:
#             values = [d["regions"].get(region, 0) for d in data]
#             datasets.append({"name": region, "values": values})

#         chart = {
#             "data": {"labels": zones, "datasets": datasets},
#             "type": "bar",
#             "stacked": 1,
#             "height": 340
#         }

#     return get_columns(), data, None, None, report_summary


# def get_columns():
#     return [
#         {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 220},
#         {"label": "Draft", "fieldname": "draft_count", "fieldtype": "Int", "width": 140},
#         {"label": "Under Process", "fieldname": "under_process_count", "fieldtype": "Int", "width": 160},
#         {"label": "Closed", "fieldname": "closed_count", "fieldtype": "Int", "width": 150},
#     ]


import frappe

def execute(filters=None):
    """
    Zone Wise Cases — clickable colored counts, correct totals.
    Access: Administrator + HR SUPPORT EXECUTIVE + HR SUPPORT MANAGER
    """

    if not filters:
        filters = {}

    # -------------------- Access control --------------------
    allowed_roles = {"HR Support Executive", "HR Support Manager"}
    user_roles = set(frappe.get_roles(frappe.session.user))
    if frappe.session.user != "Administrator" and allowed_roles.isdisjoint(user_roles):
        frappe.throw("You are not permitted to view this report.")

    # -------------------- Filters --------------------
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    case_status = filters.get("case_status")
    zone_filter = filters.get("zone")

    conditions = []
    if from_date:
        conditions.append(f"dc.issue_occurrence_date >= '{from_date}'")
    if to_date:
        conditions.append(f"dc.issue_occurrence_date <= '{to_date}'")
    if case_status:
        conditions.append(f"dc.status = '{case_status}'")
    if zone_filter:
        conditions.append(f"dc.zone = '{zone_filter}'")

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    # -------------------- Query --------------------
    query = f"""
        SELECT
            IFNULL(NULLIF(TRIM(dc.zone), ''), 'Other') AS zone,
            IFNULL(NULLIF(TRIM(dc.region), ''), 'Other') AS region,
            SUM(CASE WHEN dc.status = 'Draft' THEN 1 ELSE 0 END) AS draft_count,
            SUM(CASE WHEN dc.status = 'Under Process' THEN 1 ELSE 0 END) AS under_process_count,
            SUM(CASE WHEN dc.status = 'Closed' THEN 1 ELSE 0 END) AS closed_count
        FROM `tabDisciplinary Case` dc
        {where_clause}
        GROUP BY IFNULL(NULLIF(TRIM(dc.zone), ''), 'Other'),
                 IFNULL(NULLIF(TRIM(dc.region), ''), 'Other')
    """

    raw = frappe.db.sql(query, as_dict=True)

    # -------------------- Aggregate by zone --------------------
    zone_map = {}
    for r in raw:
        zone = r.get("zone") or "Other"
        region = r.get("region") or "Other"

        if zone not in zone_map:
            zone_map[zone] = {
                "zone": zone,
                "draft_count": 0,
                "under_process_count": 0,
                "closed_count": 0,
                "total_cases": 0,
                "regions": {}
            }

        draft = int(r.get("draft_count") or 0)
        under = int(r.get("under_process_count") or 0)
        closed = int(r.get("closed_count") or 0)

        zone_map[zone]["draft_count"] += draft
        zone_map[zone]["under_process_count"] += under
        zone_map[zone]["closed_count"] += closed
        zone_map[zone]["total_cases"] += (draft + under + closed)

        zone_map[zone]["regions"][region] = zone_map[zone]["regions"].get(region, 0) + (draft + under + closed)

    # Convert to list and sort
    data = list(zone_map.values())
    data.sort(key=lambda x: x["under_process_count"], reverse=True)

    # -------------------- Summary --------------------
    total_draft = sum(d["draft_count"] for d in data)
    total_under = sum(d["under_process_count"] for d in data)
    total_closed = sum(d["closed_count"] for d in data)
    total_cases = sum(d["total_cases"] for d in data)

    report_summary = [
        {"label": "Total Cases", "value": total_cases, "indicator": "Blue"},
        {"label": "Draft", "value": total_draft, "indicator": "Gray"},
        {"label": "Under Process", "value": total_under, "indicator": "Red"},
        {"label": "Closed", "value": total_closed, "indicator": "Green"},
    ]

    # -------------------- RETURN (chart removed) --------------------
    return get_columns(), data, None, None, report_summary


def get_columns():
    return [
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 220},
        {"label": "Draft", "fieldname": "draft_count", "fieldtype": "Int", "width": 140},
        {"label": "Under Process", "fieldname": "under_process_count", "fieldtype": "Int", "width": 160},
        {"label": "Closed", "fieldname": "closed_count", "fieldtype": "Int", "width": 150},
    ]
