# apps/sahayog/sahayog/sahayog/page/permission_config/permission_config.py

import frappe
from frappe import _


@frappe.whitelist()
def get_all_preferences():
    """Return all Report Preference records with user details for list display."""
    prefs = frappe.get_all(
        "Report Preference",
        fields=["name", "user", "modified"],
        order_by="modified desc",
        limit_page_length=0,
    )

    for p in prefs:
        p["full_name"] = frappe.db.get_value("User", p["user"], "full_name")

    return prefs


@frappe.whitelist()
def get_field_options():
    """Return all available options for all fields - hardcoded Zone/Region, dynamic for others."""
    
    # Hardcoded Zone 1-6 and Region 1-4
    zone_options = ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6"]
    region_options = ["Region 1", "Region 2", "Region 3", "Region 4"]
    
    # Dynamic options from child doctypes
    def get_child_values(child_doctype, field_name):
        """Get distinct values from child table field."""
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

    options = {
        "zone": zone_options,
        "region": region_options,
        "state": get_child_values("State Items", "state"),
        "district": get_child_values("District Items", "district"),
        "sol_id": get_child_values("Sol Items", "sol_id"),
        "product": get_child_values("Product Items", "product"),
        "source": get_child_values("Source Items", "source"),
    }

    return options


@frappe.whitelist()
def get_preference_detail(user):
    """Get existing Report Preference for specific user."""
    
    if not user:
        return None

    full_name = frappe.db.get_value("User", user, "full_name")

    # Find preference by user
    pref_name = frappe.db.get_value("Report Preference", {"user": user}, "name")

    if pref_name:
        doc = frappe.get_doc("Report Preference", pref_name)
        
        # Extract values from child tables
        return {
            "name": doc.name,
            "user": doc.user,
            "full_name": full_name,
            "zone": [getattr(r, 'zone', None) for r in (doc.zone or [])],
            "region": [getattr(r, 'region', None) for r in (doc.region or [])],
            "state": [getattr(r, 'state', None) for r in (doc.state or [])],
            "district": [getattr(r, 'district', None) for r in (doc.district or [])],
            "sol_id": [getattr(r, 'sol_id', None) for r in (doc.sol_id or [])],
            "product": [getattr(r, 'product', None) for r in (doc.product or [])],
            "source": [getattr(r, 'source', None) for r in (doc.source or [])],
        }

    # Return empty structure if no preference exists
    return {
        "name": None,
        "user": user,
        "full_name": full_name,
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

    # Find or create preference
    pref_name = frappe.db.get_value("Report Preference", {"user": user}, "name")

    if pref_name:
        doc = frappe.get_doc("Report Preference", pref_name)
    else:
        doc = frappe.new_doc("Report Preference")
        doc.user = user

    # Clear all child tables
    doc.zone = []
    doc.region = []
    doc.state = []
    doc.district = []
    doc.sol_id = []
    doc.product = []
    doc.source = []

    # Populate from selections
    for z in data.get("zone", []):
        if z:
            doc.append("zone", {"zone": z})
    
    for r in data.get("region", []):
        if r:
            doc.append("region", {"region": r})
    
    for s in data.get("state", []):
        if s:
            doc.append("state", {"state": s})
    
    for d in data.get("district", []):
        if d:
            doc.append("district", {"district": d})
    
    for sol in data.get("sol_id", []):
        if sol:
            doc.append("sol_id", {"sol_id": sol})
    
    for p in data.get("product", []):
        if p:
            doc.append("product", {"product": p})
    
    for src in data.get("source", []):
        if src:
            doc.append("source", {"source": src})

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"success": True, "name": doc.name}
