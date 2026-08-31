import json
import re
import frappe
from frappe import _
from frappe.model.document import Document

FINACLE_ROLES_MAP = {
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
    "Vigilance": "Vigilance Department Report",
    "IT": "IT Department Report",
}


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
        # Invalidate cached permissions for this user
        frappe.cache().delete_value(f"user_allowed_sols:{self.user}")
        frappe.cache().delete_value(f"user_report_pref:{self.user}")
        frappe.cache().delete_value(f"crm_branch_map:*")

    def clean_mutually_exclusive_fields(self):
        """
        If Geographical mode is chosen, clear specific sol_id.
        If Specific Branches mode is chosen, clear geographical filters.
        """
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
            frappe.throw(_("Report Preference already exists for this user."))


@frappe.whitelist()
def get_user_roles(user):
    """Returns currently assigned department/finacle roles for user."""
    if not user or not frappe.db.exists("User", user):
        return []
    current_roles = set(frappe.get_roles(user))
    assigned_pills = [pill for pill, role in FINACLE_ROLES_MAP.items() if role in current_roles]
    return assigned_pills


@frappe.whitelist()
def sync_user_roles(user, roles):
    """Sync department/finacle roles to User document."""
    if not user:
        return {"status": "error", "message": "User required"}

    # Check permission
    current_user_roles = set(frappe.get_roles(frappe.session.user))
    can_manage = (
        frappe.session.user == "Administrator"
        or "System Manager" in current_user_roles
        or "Permission Manager" in current_user_roles
    )
    if not can_manage:
        frappe.throw(_("Access Denied: You do not have permission to sync user roles."))

    if isinstance(roles, str):
        try:
            roles = json.loads(roles)
        except Exception:
            roles = [r.strip() for r in roles.split(",") if r.strip()]

    roles = set(roles or [])
    user_doc = frappe.get_doc("User", user)
    existing_roles = {r.role for r in user_doc.roles}
    roles_changed = False

    # Add selected
    for pill in roles:
        role_name = FINACLE_ROLES_MAP.get(pill)
        if role_name and role_name not in existing_roles:
            user_doc.add_roles(role_name)
            roles_changed = True

    # Remove unselected mapped roles
    for pill, role_name in FINACLE_ROLES_MAP.items():
        if pill not in roles and role_name in existing_roles:
            user_doc.remove_roles(role_name)
            roles_changed = True

    if roles_changed:
        frappe.flags.mute_messages = True
        user_doc.save(ignore_permissions=True)
        frappe.flags.mute_messages = False

    return {"status": "success", "roles": list(roles)}


@frappe.whitelist()
def get_preview_branches(zones=None, regions=None, states=None, districts=None, sol_ids=None, access_type=None):
    """
    Returns list of matching branches from `Sahayog Branch` dynamically.
    Used by the live table widget inside Report Preference.
    """
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

    # Geographical mode
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
                # Handle Table MultiSelect rows e.g. {"zone": "Zone - 1"}
                for k, v in item.items():
                    if k in ["zone", "region", "state", "district", "sol_id", "value", "name"] and v:
                        parsed.append(str(v).strip())
            elif item:
                parsed.append(str(item).strip())
        return list(dict.fromkeys(parsed))
    return []


@frappe.whitelist()
def search_user(search_text=None):
    if not search_text:
        return []
    search_query = f"{search_text}%"
    return frappe.db.sql("""
        SELECT name, full_name
        FROM `tabUser`
        WHERE (name LIKE %(starts)s OR full_name LIKE %(starts)s)
        AND enabled = 1
        ORDER BY
            CASE WHEN name LIKE %(starts)s THEN 0 ELSE 1 END,
            LENGTH(name) ASC,
            name ASC
        LIMIT 8
    """, {"starts": search_query}, as_dict=True)
