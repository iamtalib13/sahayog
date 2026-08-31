import frappe
import re
from frappe import _


# Mapping of Page Labels to actual Frappe Roles
ROLE_MAP = {
    "HR": "HR Department Report",
    "JLL": "JLL Department Report",
    "MIS": "MIS Department Report",
    "Loan": "Loan Department Report",
    "Audit": "Audit Department Report",
    "Finance": "Finance Department Report",
    "Operation": "Operation Department Report",
    "TW": "Two Wheeler Department Report",
    "Branch": "Branch Report",
    "Admin": "Finacle Report Admin",
    "Vigilance": "Vigilance Department Report"
}


def validate_page_access():
    """Ensure user is Administrator or has Permission Manager role."""
    user = frappe.session.user
    if user == "Administrator":
        return

    user_roles = frappe.get_roles(user)
    if "Permission Manager" not in user_roles:
        frappe.throw(
            _("Access Denied: You do not have the 'Permission Manager' role."), frappe.PermissionError)


@frappe.whitelist()
def get_paginated_users(search=None, page=1, page_size=20):
    validate_page_access()
    try:
        page = max(1, int(page))
        page_size = min(100, max(1, int(page_size)))
    except (ValueError, TypeError):
        page = 1
        page_size = 20

    offset = (page - 1) * page_size
    search_term = f"%{search.strip()}%" if search and search.strip() else None

    # Query active employees with linked user_id
    query_conditions = [
        "e.status = 'Active'",
        "e.user_id IS NOT NULL",
        "e.user_id != ''",
        "e.user_id NOT IN ('Guest')"
    ]
    params = {"page_size": page_size, "offset": offset}

    if search_term:
        query_conditions.append(
            "(e.name LIKE %(search)s OR e.employee_name LIKE %(search)s OR e.user_id LIKE %(search)s OR rp.tag LIKE %(search)s OR e.designation LIKE %(search)s)"
        )
        params["search"] = search_term

    where_clause = " AND ".join(query_conditions)

    # 1. Fast Total Count
    count_sql = f"""
        SELECT COUNT(e.name)
        FROM `tabEmployee` e
        LEFT JOIN `tabReport Preference` rp ON rp.user = e.user_id
        WHERE {where_clause}
    """
    total_count = frappe.db.sql(count_sql, params)[0][0] or 0

    # 2. Paginated Data with Limit & Offset (Strict 20 rows)
    data_sql = f"""
        SELECT
            e.user_id as user,
            e.employee_name as full_name,
            e.name as employee_id,
            e.designation,
            rp.name as pref_name,
            rp.tag,
            rp.enabled as pref_enabled,
            rp.access_type,
            rp.modified,
            IF(rp.name IS NOT NULL, 1, 0) as is_configured
        FROM `tabEmployee` e
        LEFT JOIN `tabReport Preference` rp ON rp.user = e.user_id
        WHERE {where_clause}
        ORDER BY
            is_configured DESC,
            rp.modified DESC,
            e.employee_name ASC
        LIMIT %(page_size)s OFFSET %(offset)s
    """
    rows = frappe.db.sql(data_sql, params, as_dict=True)

    for r in rows:
        r["enabled"] = r.get("pref_enabled") if r.get("is_configured") else 0

    total_pages = max(1, (total_count + page_size - 1) // page_size)

    return {
        "users": rows,
        "total_count": total_count,
        "total_pages": total_pages,
        "page": page,
        "page_size": page_size
    }


@frappe.whitelist()
def get_all_preferences():
    return get_paginated_users(page=1, page_size=20)


@frappe.whitelist()
def get_field_options():
    """Return all available options for all fields - dynamic from DocTypes."""

    # Zone: numeric labels "1","2","3"... from names like "Zone -1"
    def get_zone_numbers():
        try:
            if not frappe.db.exists("DocType", "Zone"):
                return []
            names = [d.name for d in frappe.get_all(
                "Zone", fields=["name"], order_by="name asc")]
            nums = []
            for n in names:
                match = re.findall(r'\d+', str(n))
                if match:
                    nums.append(match[0])
            unique_nums = list(set(nums))
            return sorted(unique_nums, key=lambda x: int(x) if x.isdigit() else x)
        except:
            return []

    # Region: map "Region-1" -> "1", ..., "Region-4" -> "4", "Head Office" -> "HO"
    def get_region_codes():
        try:
            if not frappe.db.exists("DocType", "Region"):
                return []
            names = [d.name for d in frappe.get_all(
                "Region", fields=["name"], order_by="name asc")]
            codes = []
            for n in names:
                s = str(n)
                if s.lower().strip() == "head office":
                    codes.append("HO")
                else:
                    match = re.findall(r'\d+', s)
                    if match:
                        codes.append(match[0])
            # Deduplicate and keep stable order
            seen = set()
            ordered = []
            for c in codes:
                if c not in seen:
                    seen.add(c)
                    ordered.append(c)
            return ordered
        except:
            return []

    def get_child_values(child_doctype, field_name):
        try:
            if not frappe.db.exists("DocType", child_doctype):
                return []

            values = frappe.db.sql(f"""
                SELECT DISTINCT `{field_name}`
                FROM `tab{child_doctype}`
                WHERE `{field_name}` IS NOT NULL 
                AND `{field_name}` != ''
                ORDER BY `{field_name}`
            """, as_dict=False)

            return [v[0] for v in values if v and v[0]]
        except Exception as e:
            frappe.log_error(
                f"Error getting {child_doctype}.{field_name}: {str(e)}")
            return []

    def get_doctype_options(doctype, fieldname):
        try:
            meta = frappe.get_meta(doctype)
            field = meta.get_field(fieldname)
            if field and field.options:
                return [opt.strip() for opt in field.options.split('\n') if opt.strip()]
            return []
        except:
            return []

    options = {
        "zone": get_zone_numbers(),         # ["1","2",...]
        "region": get_region_codes(),       # ["1","2","3","4","HO"]
        "state": get_child_values("State Items", "state"),
        "district": get_child_values("District Items", "district"),
        "sol_id": get_child_values("Sol Items", "sol_id"),
        "product": get_child_values("Product Items", "product"),
        "source": get_child_values("Source Items", "source"),
        "tag": get_doctype_options("Report Preference", "tag")
    }

    return options


@frappe.whitelist()
def get_preference_detail(user):
    """Get existing Report Preference and User Roles for specific user."""
    validate_page_access()

    if not user:
        return None

    full_name = frappe.db.get_value("User", user, "full_name")
    pref_name = frappe.db.get_value(
        "Report Preference", {"user": user}, "name")

    # Fetch User's current roles from the system for the pills
    user_roles = frappe.get_roles(user)
    assigned_finacle_pills = [pill for pill,
                              role in ROLE_MAP.items() if role in user_roles]

    if pref_name:
        doc = frappe.get_doc("Report Preference", pref_name)

        # Helper: "Zone -1" -> "1"
        def zone_to_code(val):
            if not val:
                return None
            nums = re.findall(r'\d+', str(val))
            return nums[0] if nums else None

        # Helper: "Head Office" -> "HO", else digits
        def region_to_code(val):
            if not val:
                return None
            s = str(val).strip()
            if s.lower() == "head office":
                return "HO"
            nums = re.findall(r'\d+', s)
            return nums[0] if nums else None

        return {
            "name": doc.name,
            "user": doc.user,
            "full_name": full_name,
            "tag": doc.tag,
            "enabled": bool(doc.enabled),
            "zone": [z for z in (zone_to_code(row.zone) for row in (doc.zone or []) if row.zone) if z],
            "region": [r for r in (region_to_code(row.region) for row in (doc.region or []) if row.region) if r],
            "state": [row.state for row in (doc.state or []) if row.state],
            "district": [row.district for row in (doc.district or []) if row.district],
            "sol_id": [row.sol_id for row in (doc.sol_id or []) if row.sol_id],
            "product": [row.product for row in (doc.product or []) if row.product],
            "source": [row.source for row in (doc.source or []) if row.source],
            "finacle_roles": assigned_finacle_pills
        }

    return {
        "name": None,
        "user": user,
        "full_name": full_name,
        "tag": "",
        "enabled": True,
        "zone": [],
        "region": [],
        "state": [],
        "district": [],
        "sol_id": [],
        "product": [],
        "source": [],
        "finacle_roles": assigned_finacle_pills
    }


# @frappe.whitelist()
# def save_preference(data):
#     """Auto-save Report Preference and Sync User Roles."""
#     validate_page_access()
#     import json

#     if isinstance(data, str):
#         data = json.loads(data)

#     user_id = data.get("user")
#     if not user_id:
#         frappe.throw(_("User is required"))

#     # 1. HANDLE REPORT PREFERENCE DOCTYPE
#     pref_name = frappe.db.get_value(
#         "Report Preference", {"user": user_id}, "name")
#     if pref_name:
#         doc = frappe.get_doc("Report Preference", pref_name)
#     else:
#         doc = frappe.new_doc("Report Preference")
#         doc.user = user_id

#     doc.tag = data.get("tag")
#     doc.enabled = 1 if data.get("enabled") else 0

#     # Clear and Repopulate Child Tables
#     doc.zone = []
#     doc.region = []
#     doc.state = []
#     doc.district = []
#     doc.sol_id = []
#     doc.product = []
#     doc.source = []

#     for z in data.get("zone", []):
#         if not z:
#             continue
#         zone_name = f"Zone -{z}"
#         if frappe.db.exists("Zone", zone_name):
#             doc.append("zone", {"zone": zone_name})
#         elif frappe.db.exists("Zone", z):
#             doc.append("zone", {"zone": z})

#     for r in data.get("region", []):
#         if not r:
#             continue
#         code = str(r).strip()
#         region_name = "Head Office" if code.upper(
#         ) == "HO" else f"Region-{code}"
#         if frappe.db.exists("Region", region_name):
#             doc.append("region", {"region": region_name})
#         elif frappe.db.exists("Region", r):
#             doc.append("region", {"region": r})

#     # Simple fields
#     for field in ["state", "district", "sol_id", "product", "source"]:
#         for val in data.get(field, []):
#             if val:
#                 doc.append(field, {field: val})

#     doc.save(ignore_permissions=True)

#     # 2. HANDLE USER ROLE SYNC
#     # 2. HANDLE USER ROLE SYNC
#     selected_pills = data.get("finacle_roles", [])
#     user_doc = frappe.get_doc("User", user_id)

#     roles_to_have = [ROLE_MAP[p] for p in selected_pills if p in ROLE_MAP]
#     current_roles = [r.role for r in user_doc.roles]

#     roles_changed = False
#     for role in roles_to_have:
#         if role not in current_roles:
#             user_doc.add_roles(role)
#             roles_changed = True

#     for pill, role in ROLE_MAP.items():
#         if pill not in selected_pills and role in current_roles:
#             user_doc.remove_roles(role)
#             roles_changed = True

#     if roles_changed:
#         # 1. Block standard messages
#         frappe.flags.mute_messages = True

#         # 2. Save the user
#         user_doc.save(ignore_permissions=True)

#         # 3. CRITICAL: Clear the global message log to hide the "Permission Cleared" popup
#         if hasattr(frappe.local, "message_log"):
#             frappe.local.message_log = []

#         frappe.flags.mute_messages = False

#     frappe.db.commit()

#     return {"success": True, "name": doc.name}

# new
# @frappe.whitelist()
# def save_preference(data):
#     validate_page_access()
#     import json

#     if isinstance(data, str):
#         data = json.loads(data)

#     userid = data.get("user")
#     if not userid:
#         frappe.throw("User is required")

#     def normalize_list(value):
#         if not value:
#             return []
#         if isinstance(value, list):
#             return [v for v in value if v]
#         return []

#     def zone_to_name(val):
#         if not val:
#             return None
#         z = str(val).strip()
#         zone_name = f"Zone -{z}" if not z.startswith("Zone") else z
#         if frappe.db.exists("Zone", zone_name):
#             return zone_name
#         if frappe.db.exists("Zone", z):
#             return z
#         alt_zone_name = f"Zone - {z}"
#         if frappe.db.exists("Zone", alt_zone_name):
#             return alt_zone_name
#         return None

#     def region_to_name(val):
#         if not val:
#             return None
#         code = str(val).strip()
#         if code.upper() == "HO":
#             if frappe.db.exists("Region", "Head Office"):
#                 return "Head Office"
#             return None

#         region_name = f"Region-{code}"
#         if frappe.db.exists("Region", region_name):
#             return region_name

#         alt_region_name = f"Region - {code}"
#         if frappe.db.exists("Region", alt_region_name):
#             return alt_region_name

#         if frappe.db.exists("Region", code):
#             return code

#         return None

#     prefname = frappe.db.get_value(
#         "Report Preference", {"user": userid}, "name")
#     if prefname:
#         doc = frappe.get_doc("Report Preference", prefname)
#     else:
#         doc = frappe.new_doc("Report Preference")
#         doc.user = userid

#     doc.tag = data.get("tag") or ""
#     doc.enabled = 1 if data.get("enabled") else 0

#     doc.set("zone", [])
#     doc.set("region", [])
#     doc.set("state", [])
#     doc.set("district", [])
#     doc.set("sol_id", [])
#     doc.set("product", [])
#     doc.set("source", [])

#     for z in normalize_list(data.get("zone")):
#         zone_name = zone_to_name(z)
#         if zone_name:
#             doc.append("zone", {"zone": zone_name})

#     for r in normalize_list(data.get("region")):
#         region_name = region_to_name(r)
#         if region_name:
#             doc.append("region", {"region": region_name})

#     for state in normalize_list(data.get("state")):
#         doc.append("state", {"state": state})

#     for district in normalize_list(data.get("district")):
#         doc.append("district", {"district": district})

#     sol_id_values = normalize_list(data.get("sol_id"))
#     if not sol_id_values:
#         sol_id_values = normalize_list(data.get("sol_id"))

#     for sol in sol_id_values:
#         doc.append("sol_id", {"sol_id": sol})

#     for product in normalize_list(data.get("product")):
#         doc.append("product", {"product": product})

#     for source in normalize_list(data.get("source")):
#         doc.append("source", {"source": source})

#     frappe.flags.mute_messages = True
#     if hasattr(frappe.local, "message_log"):
#         frappe.local.message_log = []

#     doc.save(ignore_permissions=True)

#     selected_pills = normalize_list(data.get("finacleroles"))

#     current_user_roles = set(frappe.get_roles(frappe.session.user))
#     can_manage_user_roles = (
#         frappe.session.user == "Administrator"
#         or "System Manager" in current_user_roles
#     )

#     if can_manage_user_roles:
#         userdoc = frappe.get_doc("User", userid)
#         roles_to_have = [ROLEMAP[p] for p in selected_pills if p in ROLEMAP]
#         current_roles = [r.role for r in userdoc.roles]
#         roles_changed = False

#         for role in roles_to_have:
#             if role not in current_roles:
#                 userdoc.add_roles(role)
#                 roles_changed = True

#         for pill, role in ROLEMAP.items():
#             if pill not in selected_pills and role in current_roles:
#                 userdoc.remove_roles(role)
#                 roles_changed = True

#         if roles_changed:
#             frappe.flags.mute_messages = True
#             if hasattr(frappe.local, "message_log"):
#                 frappe.local.message_log = []
#             userdoc.save(ignore_permissions=True)

#     frappe.flags.mute_messages = False
#     if hasattr(frappe.local, "message_log"):
#         frappe.local.message_log = []

#     frappe.db.commit()
#     return {
#         "success": True,
#         "name": doc.name
#     }


@frappe.whitelist()
def save_preference(data):
    validate_page_access()
    import json

    if isinstance(data, str):
        data = json.loads(data)

    userid = data.get("user")
    if not userid:
        frappe.throw("User is required")

    def normalize_list(value):
        if not value:
            return []
        if isinstance(value, list):
            return [v for v in value if v]
        return []

    def zone_to_name(val):
        if not val:
            return None
        z = str(val).strip()
        if z.startswith("Zone"):
            if frappe.db.exists("Zone", z):
                return z
        zone_name = f"Zone -{z}"
        if frappe.db.exists("Zone", zone_name):
            return zone_name
        alt_zone_name = f"Zone - {z}"
        if frappe.db.exists("Zone", alt_zone_name):
            return alt_zone_name
        if frappe.db.exists("Zone", z):
            return z
        return None

    def region_to_name(val):
        if not val:
            return None
        code = str(val).strip()

        if code.upper() == "HO":
            if frappe.db.exists("Region", "Head Office"):
                return "Head Office"
            return None

        region_name = f"Region-{code}"
        if frappe.db.exists("Region", region_name):
            return region_name

        alt_region_name = f"Region - {code}"
        if frappe.db.exists("Region", alt_region_name):
            return alt_region_name

        if frappe.db.exists("Region", code):
            return code

        return None

    prefname = frappe.db.get_value(
        "Report Preference", {"user": userid}, "name")
    if prefname:
        doc = frappe.get_doc("Report Preference", prefname)
    else:
        doc = frappe.new_doc("Report Preference")
        doc.user = userid

    doc.tag = data.get("tag") or ""
    doc.enabled = 1 if data.get("enabled") else 0

    doc.set("zone", [])
    doc.set("region", [])
    doc.set("state", [])
    doc.set("district", [])
    doc.set("sol_id", [])
    doc.set("product", [])
    doc.set("source", [])

    for z in normalize_list(data.get("zone")):
        zone_name = zone_to_name(z)
        if zone_name:
            doc.append("zone", {"zone": zone_name})

    for r in normalize_list(data.get("region")):
        region_name = region_to_name(r)
        if region_name:
            doc.append("region", {"region": region_name})

    for state in normalize_list(data.get("state")):
        doc.append("state", {"state": state})

    for district in normalize_list(data.get("district")):
        doc.append("district", {"district": district})

    sol_id_values = normalize_list(data.get("sol_id"))
    if not sol_id_values:
        sol_id_values = normalize_list(data.get("sol_id"))

    for sol in sol_id_values:
        doc.append("sol_id", {"sol_id": sol})

    for product in normalize_list(data.get("product")):
        doc.append("product", {"product": product})

    for source in normalize_list(data.get("source")):
        doc.append("source", {"source": source})

    frappe.flags.mute_messages = True
    if hasattr(frappe.local, "message_log"):
        frappe.local.message_log = []

    doc.save(ignore_permissions=True)

    selected_pills = normalize_list(data.get("finacleroles"))

    current_user_roles = set(frappe.get_roles(frappe.session.user))
    can_manage_user_roles = (
        frappe.session.user == "Administrator"
        or "System Manager" in current_user_roles
    )

    if can_manage_user_roles:
        userdoc = frappe.get_doc("User", userid)
        roles_to_have = [ROLE_MAP[p] for p in selected_pills if p in ROLE_MAP]
        current_roles = [r.role for r in userdoc.roles]
        roles_changed = False

        for role in roles_to_have:
            if role not in current_roles:
                userdoc.add_roles(role)
                roles_changed = True

        for pill, role in ROLE_MAP.items():
            if pill not in selected_pills and role in current_roles:
                userdoc.remove_roles(role)
                roles_changed = True

        if roles_changed:
            frappe.flags.mute_messages = True
            if hasattr(frappe.local, "message_log"):
                frappe.local.message_log = []
            userdoc.save(ignore_permissions=True)

    frappe.flags.mute_messages = False
    if hasattr(frappe.local, "message_log"):
        frappe.local.message_log = []

    frappe.db.commit()
    return {
        "success": True,
        "name": doc.name
    }


@frappe.whitelist()
def search_user(search_text=None):
    if not search_text:
        return []
    search_query = f"{search_text}%"
    return frappe.db.sql("""
        SELECT name, full_name FROM `tabUser`
        WHERE (name LIKE %(starts)s OR full_name LIKE %(starts)s) AND enabled = 1
        ORDER BY CASE WHEN name LIKE %(starts)s THEN 0 ELSE 1 END, LENGTH(name) ASC, name ASC
        LIMIT 10
    """, {"starts": search_query}, as_dict=True)


@frappe.whitelist()
def search_branch(search_text=None):
    if not search_text:
        return []

    # We remove 'enabled' filter because it doesn't exist in your DocType
    return frappe.get_all(
        "Sahayog Branch",
        fields=["name", "branch"],
        filters=[],
        or_filters=[
            ["name", "like", f"%{search_text}%"],
            ["branch", "like", f"%{search_text}%"]
        ],
        limit_page_length=20
    )
