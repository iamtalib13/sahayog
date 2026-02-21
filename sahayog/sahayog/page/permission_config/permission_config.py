import frappe
import re
from frappe import _

@frappe.whitelist()
def get_all_preferences():
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
    
    # Helper: Get options as simple numbers (strings "1", "2") for Zone/Region
    def get_list_values_as_numbers(doctype):
        try:
            if not frappe.db.exists("DocType", doctype): return []
            names = [d.name for d in frappe.get_all(doctype, fields=["name"], order_by="name asc")]
            
            # Convert "Zone -1" -> "1"
            nums = []
            for n in names:
                # Find all digits in the name
                match = re.findall(r'\d+', str(n))
                if match:
                    nums.append(match[0])
            
            # Remove duplicates and sort numerically
            unique_nums = list(set(nums))
            return sorted(unique_nums, key=lambda x: int(x) if x.isdigit() else x)
        except:
            return []

    # Dynamic options from child doctypes
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

    # Fetch options specifically for the Tag Select field from DocType metadata
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
        "zone": get_list_values_as_numbers("Zone"),     # Returns ["1", "2", ...]
        "region": get_list_values_as_numbers("Region"), # Returns ["1", "2", ...]
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

        # Robust converter: "Zone -1" -> "1" (as string)
        def to_num_str(val):
            if not val: return None
            nums = re.findall(r'\d+', str(val))
            if nums:
                return nums[0]
            return None

        return {
            "name": doc.name,
            "user": doc.user,
            "full_name": full_name,
            "tag": doc.tag,
            # Ensure we return strings to match frontend options
            "zone": [to_num_str(row.zone) for row in (doc.zone or []) if row.zone],
            "region": [to_num_str(row.region) for row in (doc.region or []) if row.region],
            "state": [row.state for row in (doc.state or []) if row.state],
            "district": [row.district for row in (doc.district or []) if row.district],
            "sol_id": [row.sol_id for row in (doc.sol_id or []) if row.sol_id],
            "product": [row.product for row in (doc.product or []) if row.product],
            "source": [row.source for row in (doc.source or []) if row.source],
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
    }

@frappe.whitelist()
def save_preference(data):
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

    # Clear child tables
    doc.zone = []
    doc.region = []
    doc.state = []
    doc.district = []
    doc.sol_id = []
    doc.product = []
    doc.source = []

    # Populate ZONE: UI sends "1" -> Backend stores "Zone -1"
    for z in data.get("zone", []):
        if not z: continue
        
        # Try primary format "Zone -1"
        zone_name = f"Zone -{z}"
        
        if not frappe.db.exists("Zone", zone_name):
            # Fallback: maybe name is just "1"
            if frappe.db.exists("Zone", z):
                zone_name = z
            else:
                continue # Skip invalid
        
        doc.append("zone", {"zone": zone_name})

    # Populate REGION: UI sends "1" -> Backend stores "Region -1"
    for r in data.get("region", []):
        if not r: continue
        
        region_name = f"Region -{r}"
        
        if not frappe.db.exists("Region", region_name):
            if frappe.db.exists("Region", r):
                region_name = r
            else:
                continue
        
        doc.append("region", {"region": region_name})

    # Other simple text fields
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

    # Save with relaxed validation for SPA experience
    # (Relies on DocType validation method being commented out or tolerating missing fields)
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
