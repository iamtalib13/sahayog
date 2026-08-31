import json
import re
import frappe
from frappe import _
from frappe.model.document import Document


class ReportPreference(Document):

    def autoname(self):
        if not self.user:
            frappe.throw(_("User is required"))
        self.name = self.user

    def before_insert(self):
        self.check_admin_access()

    def validate(self):
        self.check_admin_access()
        self.validate_unique_preference()
        self.clean_mutually_exclusive_fields()

    def on_update(self):
        frappe.cache().delete_value(f"user_allowed_sols:{self.user}")
        frappe.cache().delete_value(f"user_report_pref:{self.user}")
        frappe.cache().delete_value("crm_branch_map:*")

    def clean_mutually_exclusive_fields(self):
        if self.access_type == "Geographical (Zone / Region / District)":
            self.set("sol_id", [])
        elif self.access_type == "Specific Branches (SOL ID)":
            self.set("zone", [])
            self.set("region", [])
            self.set("state", [])
            self.set("district", [])

    def check_admin_access(self):
        user = frappe.session.user
        allowed_roles = {"Administrator", "System Manager", "Permission Manager"}
        user_roles = set(frappe.get_roles(user))

        if user != "Administrator" and not allowed_roles.intersection(user_roles):
            frappe.throw(
                _("Access Denied: Only Administrators and System Managers can manage Report Preferences.")
            )

    def validate_unique_preference(self):
        existing = frappe.db.exists(
            "Report Preference",
            {
                "user": self.user,
                "name": ["!=", self.name],
            }
        )
        if existing:
            frappe.throw(_("Report Preference already exists for user {0}.").format(self.user))


@frappe.whitelist()
def get_widget_meta(user=None):
    """
    Returns metadata needed by the Pure HTML CRUD widget:
    - Master lists of Zones, Regions, Districts, States, and all Branches
    - Available tags
    - Current saved preference data for the specified user (if any)
    """
    zones = frappe.db.sql(
        "SELECT DISTINCT zone FROM `tabSahayog Branch` WHERE zone IS NOT NULL AND zone != '' ORDER BY zone ASC",
        pluck=True
    )
    regions = frappe.db.sql(
        "SELECT DISTINCT region FROM `tabSahayog Branch` WHERE region IS NOT NULL AND region != '' ORDER BY region ASC",
        pluck=True
    )
    districts = frappe.db.sql(
        "SELECT DISTINCT district FROM `tabSahayog Branch` WHERE district IS NOT NULL AND district != '' ORDER BY district ASC",
        pluck=True
    )
    all_branches = frappe.get_all(
        "Sahayog Branch",
        fields=["sol_id", "branch", "zone", "region", "district"],
        order_by="sol_id asc",
        limit_page_length=2000
    )

    tags = ["COM", "ROM", "RM", "AZM", "ZM"]

    pref_data = None
    if user and frappe.db.exists("User", user):
        pref_name = frappe.db.get_value("Report Preference", {"user": user}, "name")
        if pref_name:
            doc = frappe.get_doc("Report Preference", pref_name)
            pref_data = {
                "name": doc.name,
                "user": doc.user,
                "full_name": doc.full_name,
                "enabled": bool(doc.enabled),
                "tag": doc.tag or "",
                "access_type": doc.access_type or "Geographical (Zone / Region / District)",
                "zones": [d.zone for d in doc.get("zone", []) if d.zone],
                "regions": [d.region for d in doc.get("region", []) if d.region],
                "districts": [d.district for d in doc.get("district", []) if d.district],
                "states": [d.state for d in doc.get("state", []) if d.state],
                "sol_ids": [str(d.sol_id) for d in doc.get("sol_id", []) if d.sol_id],
            }

    return {
        "master_zones": [z for z in zones if z],
        "master_regions": [r for r in regions if r],
        "master_districts": [d for d in districts if d],
        "all_branches": all_branches,
        "tags": tags,
        "user_preference": pref_data,
    }


@frappe.whitelist()
def save_widget_preference(data):
    """
    Direct CRUD API for the HTML Widget.
    Saves Report Preference in an atomic call.
    """
    if isinstance(data, str):
        data = json.loads(data)

    user_id = data.get("user")
    if not user_id:
        frappe.throw(_("User is required"))

    # Permission check
    current_roles = set(frappe.get_roles(frappe.session.user))
    if frappe.session.user != "Administrator" and not {"System Manager", "Permission Manager"}.intersection(current_roles):
        frappe.throw(_("Access Denied: Only Administrators/System Managers can modify Report Preferences."))

    pref_name = frappe.db.get_value("Report Preference", {"user": user_id}, "name")
    if pref_name:
        doc = frappe.get_doc("Report Preference", pref_name)
    else:
        doc = frappe.new_doc("Report Preference")
        doc.user = user_id

    doc.enabled = 1 if data.get("enabled", True) else 0
    doc.tag = data.get("tag") or ""
    access_type = data.get("access_type") or "Geographical (Zone / Region / District)"
    doc.access_type = access_type

    doc.set("zone", [])
    doc.set("region", [])
    doc.set("district", [])
    doc.set("state", [])
    doc.set("sol_id", [])

    if access_type == "Geographical (Zone / Region / District)":
        for z in data.get("zones", []):
            if z:
                doc.append("zone", {"zone": z})
        for r in data.get("regions", []):
            if r:
                doc.append("region", {"region": r})
        for d in data.get("districts", []):
            if d:
                doc.append("district", {"district": d})
    else:
        for sol in data.get("sol_ids", []):
            if sol:
                doc.append("sol_id", {"sol_id": str(sol)})

    frappe.flags.mute_messages = True
    doc.save(ignore_permissions=True)
    frappe.flags.mute_messages = False

    frappe.db.commit()

    frappe.cache().delete_value(f"user_allowed_sols:{user_id}")
    frappe.cache().delete_value(f"user_report_pref:{user_id}")

    return {
        "status": "success",
        "name": doc.name,
        "message": _("Report Preferences saved successfully!")
    }


@frappe.whitelist()
def get_preview_branches(zones=None, regions=None, states=None, districts=None, sol_ids=None, access_type=None):
    zones = _parse_input_list(zones)
    regions = _parse_input_list(regions)
    states = _parse_input_list(states)
    districts = _parse_input_list(districts)
    sol_ids = _parse_input_list(sol_ids)

    if access_type == "Specific Branches (SOL ID)" or (sol_ids and not (zones or regions or states or districts)):
        if not sol_ids:
            return []
        return frappe.get_all(
            "Sahayog Branch",
            filters={"sol_id": ["in", sol_ids]},
            fields=["sol_id", "branch", "zone", "region", "district", "state"],
            order_by="sol_id asc",
            limit_page_length=500
        )

    if not (zones or regions or states or districts):
        return []

    conditions = []
    values = {}

    if zones:
        conditions.append("zone IN %(zones)s")
        values["zones"] = tuple(zones)
    if regions:
        conditions.append("region IN %(regions)s")
        values["regions"] = tuple(regions)
    if states:
        conditions.append("state IN %(states)s")
        values["states"] = tuple(states)
    if districts:
        conditions.append("district IN %(districts)s")
        values["districts"] = tuple(districts)

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    query = f"""
        SELECT sol_id, branch, zone, region, district, state
        FROM `tabSahayog Branch`
        WHERE {where_clause}
        ORDER BY sol_id ASC
        LIMIT 1000
    """
    return frappe.db.sql(query, values, as_dict=True)


def _parse_input_list(val):
    if not val:
        return []
    if isinstance(val, str):
        try:
            val = json.loads(val)
        except Exception:
            val = [x.strip() for x in val.split(",") if x.strip()]
    if isinstance(val, list):
        parsed = []
        for item in val:
            if isinstance(item, dict):
                for k, v in item.items():
                    if k in ["zone", "region", "state", "district", "sol_id", "value", "name"] and v:
                        parsed.append(str(v).strip())
            elif item:
                parsed.append(str(item).strip())
        return list(dict.fromkeys(parsed))
    return []


@frappe.whitelist()
def search_user(search_text=None, current_docname=None):
    if not search_text:
        return []
    search_query = f"{search_text}%"
    users = frappe.db.sql("""
        SELECT name, full_name
        FROM `tabUser`
        WHERE (name LIKE %(starts)s OR full_name LIKE %(starts)s)
        AND enabled = 1
        ORDER BY
            CASE WHEN name LIKE %(starts)s THEN 0 ELSE 1 END,
            LENGTH(name) ASC,
            name ASC
        LIMIT 10
    """, {"starts": search_query}, as_dict=True)

    existing_map = {}
    existing_records = frappe.get_all(
        "Report Preference",
        fields=["name", "user"]
    )
    for r in existing_records:
        if r.user:
            existing_map[r.user] = r.name

    for u in users:
        u_name = u["name"]
        if u_name in existing_map and existing_map[u_name] != current_docname:
            u["is_already_added"] = True
            u["pref_docname"] = existing_map[u_name]
        else:
            u["is_already_added"] = False
            u["pref_docname"] = None

    return users
