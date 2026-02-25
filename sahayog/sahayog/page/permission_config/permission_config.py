import frappe
import re
from frappe import _

def validate_page_access():
    """Ensure user is Administrator or has Permission Manager role."""
    user = frappe.session.user
    if user == "Administrator":
        return
    
    user_roles = frappe.get_roles(user)
    if "Permission Manager" not in user_roles:
        frappe.throw(_("Access Denied: You do not have the 'Permission Manager' role."), frappe.PermissionError)

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
            names = [d.name for d in frappe.get_all("Zone", fields=["name"], order_by="name asc")]
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
            names = [d.name for d in frappe.get_all("Region", fields=["name"], order_by="name asc")]
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
            frappe.log_error(f"Error getting {child_doctype}.{field_name}: {str(e)}")
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
    """Get existing Report Preference for specific user."""
    
    if not user:
        return None

    full_name = frappe.db.get_value("User", user, "full_name")
    pref_name = frappe.db.get_value("Report Preference", {"user": user}, "name")

    if pref_name:
        doc = frappe.get_doc("Report Preference", pref_name)

        # Zone: "Zone -1" -> "1"
        def zone_to_code(val):
            if not val:
                return None
            nums = re.findall(r'\d+', str(val))
            if nums:
                return nums[0]
            return None

        # Region: "Region-1" -> "1", "Region-2" -> "2", "Region-3" -> "3", "Region-4" -> "4", "Head Office" -> "HO"
        def region_to_code(val):
            if not val:
                return None
            s = str(val).strip()
            if s.lower() == "head office":
                return "HO"
            nums = re.findall(r'\d+', s)
            if nums:
                return nums[0]
            return None

        return {
            "name": doc.name,
            "user": doc.user,
            "full_name": full_name,
            "tag": doc.tag,
            "zone": [z for z in (zone_to_code(row.zone) for row in (doc.zone or []) if row.zone) if z],
            "region": [r for r in (region_to_code(row.region) for row in (doc.region or []) if row.region) if r],
            "state": [row.state for row in (doc.state or []) if row.state],
            "district": [row.district for row in (doc.district or []) if row.district],
            "sol_id": [row.sol_id for row in (doc.sol_id or []) if row.sol_id],
            "product": [row.product for row in (doc.product or []) if row.product],
            "source": [row.source for row in (doc.source or []) if row.source],
            "enabled": bool(doc.enabled),
        }

    return {
        "name": None,
        "user": user,
        "full_name": full_name,
        "tag": "",
        "zone": [],
        "region": [],
        "state": [],
        "district": [],
        "sol_id": [],
        "product": [],
        "source": [],
        "enabled": True,

    }

@frappe.whitelist()
def save_preference(data):
    validate_page_access()
    """Auto-save/update Report Preference for user."""
    import json

    if isinstance(data, str):
        data = json.loads(data)

    user = data.get("user")
    if not user:
        frappe.throw(_("User is required"))

    pref_name = frappe.db.get_value("Report Preference", {"user": user}, "name")

    if pref_name:
        doc = frappe.get_doc("Report Preference", pref_name)
    else:
        doc = frappe.new_doc("Report Preference")
        doc.user = user

    # Save the tag
    doc.tag = data.get("tag")

    # Save enabled status
    doc.enabled = 1 if data.get("enabled") else 0

    # Clear child tables
    doc.zone = []
    doc.region = []
    doc.state = []
    doc.district = []
    doc.sol_id = []
    doc.product = []
    doc.source = []

    # ZONE: UI sends "1","2","3" → store "Zone -1"
    for z in data.get("zone", []):
        if not z:
            continue
        zone_name = f"Zone -{z}"
        if not frappe.db.exists("Zone", zone_name):
            if frappe.db.exists("Zone", z):
                zone_name = z
            else:
                continue
        doc.append("zone", {"zone": zone_name})

    # REGION: UI sends "1","2","3","4","HO"
    # Map codes back to Region doc names:
    #  "1" -> Region-1
    #  "2" -> Region-2
    #  "3" -> Region-3
    #  "4" -> Region-4
    #  "HO" -> Head Office
    for r in data.get("region", []):
        if not r:
            continue

        code = str(r).strip()
        if code.upper() == "HO":
            region_name = "Head Office"
        else:
            region_name = f"Region-{code}"

        if not frappe.db.exists("Region", region_name):
            # Try raw code as fallback
            if frappe.db.exists("Region", code):
                region_name = code
            else:
                continue

        doc.append("region", {"region": region_name})

    for s in data.get("state", []):
        if s: doc.append("state", {"state": s})
    
    for d in data.get("district", []):
        if d: doc.append("district", {"district": d})
    
    for sol in data.get("sol_id", []):
        if sol: doc.append("sol_id", {"sol_id": sol})
    
    for p in data.get("product", []):
        if p: doc.append("product", {"product": p})
    
    for src in data.get("source", []):
        if src: doc.append("source", {"source": src})

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"success": True, "name": doc.name}

@frappe.whitelist()
def search_user(search_text=None):
    if not search_text: return []
    search_query = f"{search_text}%"
    return frappe.db.sql("""
        SELECT name, full_name FROM `tabUser`
        WHERE (name LIKE %(starts)s OR full_name LIKE %(starts)s) AND enabled = 1
        ORDER BY CASE WHEN name LIKE %(starts)s THEN 0 ELSE 1 END, LENGTH(name) ASC, name ASC
        LIMIT 10
    """, {"starts": search_query}, as_dict=True)


@frappe.whitelist()
def search_branch(search_text=None):
    if not search_text: return []
    
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
