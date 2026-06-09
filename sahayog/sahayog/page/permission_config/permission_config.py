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
def get_all_preferences():
    validate_page_access()
    """Return all Report Preference records with user details for list display."""
    prefs = frappe.get_all(
        "Report Preference",
        fields=["name", "user", "modified", "tag"],
        order_by="modified desc",
        limit_page_length=0,
    )

    for p in prefs:
        p["full_name"] = frappe.db.get_value("User", p["user"], "full_name")

    return prefs


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


@frappe.whitelist()
def save_preference(data):
    """Auto-save Report Preference and Sync User Roles."""
    validate_page_access()
    import json

    if isinstance(data, str):
        data = json.loads(data)

    user_id = data.get("user")
    if not user_id:
        frappe.throw(_("User is required"))

    # 1. HANDLE REPORT PREFERENCE DOCTYPE
    pref_name = frappe.db.get_value(
        "Report Preference", {"user": user_id}, "name")
    if pref_name:
        doc = frappe.get_doc("Report Preference", pref_name)
    else:
        doc = frappe.new_doc("Report Preference")
        doc.user = user_id

    doc.tag = data.get("tag")
    doc.enabled = 1 if data.get("enabled") else 0

    # Clear and Repopulate Child Tables
    doc.zone = []
    doc.region = []
    doc.state = []
    doc.district = []
    doc.sol_id = []
    doc.product = []
    doc.source = []

    for z in data.get("zone", []):
        if not z:
            continue
        zone_name = f"Zone -{z}"
        if frappe.db.exists("Zone", zone_name):
            doc.append("zone", {"zone": zone_name})
        elif frappe.db.exists("Zone", z):
            doc.append("zone", {"zone": z})

    for r in data.get("region", []):
        if not r:
            continue
        code = str(r).strip()
        region_name = "Head Office" if code.upper(
        ) == "HO" else f"Region-{code}"
        if frappe.db.exists("Region", region_name):
            doc.append("region", {"region": region_name})
        elif frappe.db.exists("Region", r):
            doc.append("region", {"region": r})

    # Simple fields
    for field in ["state", "district", "sol_id", "product", "source"]:
        for val in data.get(field, []):
            if val:
                doc.append(field, {field: val})

    doc.save(ignore_permissions=True)

    # 2. HANDLE USER ROLE SYNC
    # 2. HANDLE USER ROLE SYNC
    selected_pills = data.get("finacle_roles", [])
    user_doc = frappe.get_doc("User", user_id)

    roles_to_have = [ROLE_MAP[p] for p in selected_pills if p in ROLE_MAP]
    current_roles = [r.role for r in user_doc.roles]

    roles_changed = False
    for role in roles_to_have:
        if role not in current_roles:
            user_doc.add_roles(role)
            roles_changed = True

    for pill, role in ROLE_MAP.items():
        if pill not in selected_pills and role in current_roles:
            user_doc.remove_roles(role)
            roles_changed = True

    if roles_changed:
        # 1. Block standard messages
        frappe.flags.mute_messages = True

        # 2. Save the user
        user_doc.save(ignore_permissions=True)

        # 3. CRITICAL: Clear the global message log to hide the "Permission Cleared" popup
        if hasattr(frappe.local, "message_log"):
            frappe.local.message_log = []

        frappe.flags.mute_messages = False

    frappe.db.commit()

    return {"success": True, "name": doc.name}


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
