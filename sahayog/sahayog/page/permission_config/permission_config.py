import frappe
import re
from frappe import _

@frappe.whitelist()
def get_all_preferences():
    """Return all Report Preference records with user details for list display."""
    # Updated to fetch 'tag'
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
    
    def get_list_values(doctype, field_name="name"):
        try:
            if not frappe.db.exists("DocType", doctype):
                return []
            return [d[field_name] for d in frappe.get_all(doctype, fields=[field_name], order_by=f"{field_name} asc")]
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

    # NEW: Fetch options specifically for the Tag Select field from DocType metadata
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
        "zone": get_list_values("Zone"),
        "region": get_list_values("Region"),
        "state": get_child_values("State Items", "state"),
        "district": get_child_values("District Items", "district"),
        "sol_id": get_child_values("Sol Items", "sol_id"),
        "product": get_child_values("Product Items", "product"),
        "source": get_child_values("Source Items", "source"),
        "tag": get_doctype_options("Report Preference", "tag") # Fetches COM, ROM, ZM etc.
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
        
        def to_num(val):
            if not val: return None
            return re.sub(r"\D", "", str(val))

        return {
            "name": doc.name,
            "user": doc.user,
            "full_name": full_name,
            "tag": doc.tag, # Return the saved tag
            "zone": [to_num(getattr(r, 'zone', None)) for r in (doc.zone or [])],
            "region": [to_num(getattr(r, 'region', None)) for r in (doc.region or [])],
            "state": [getattr(r, 'state', None) for r in (doc.state or [])],
            "district": [getattr(r, 'district', None) for r in (doc.district or [])],
            "sol_id": [getattr(r, 'sol_id', None) for r in (doc.sol_id or [])],
            "product": [getattr(r, 'product', None) for r in (doc.product or [])],
            "source": [getattr(r, 'source', None) for r in (doc.source or [])],
        }

    return {
        "name": None,
        "user": user,
        "full_name": full_name,
        "tag": "", # Default empty
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

    # Populate from selections
    for z in data.get("zone", []):
        if z: doc.append("zone", {"zone": z})
    
    for r in data.get("region", []):
        if r: doc.append("region", {"region": r})
    
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

# search_user remains the same...
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
