# apps/sahayog/sahayog/sahayog/page/permission_config/permission_config.py

import frappe
from frappe import _


@frappe.whitelist()
def get_all_preferences():
    """Return all Report Preference records with user details for list display."""
    prefs = frappe.get_all(
        "Report Preference",
        fields=["name", "user", "report_type", "modified"],
        order_by="modified desc",
        limit_page_length=0,
    )

    for p in prefs:
        p["full_name"] = frappe.db.get_value("User", p["user"], "full_name")

    return prefs


@frappe.whitelist()
def get_field_options():
    """Return all available options for Zone, Region, State, District, Sol, Product, Source from child DocTypes."""
    
    def get_items(doctype, field_name=None):
        """Helper to fetch all items from a child doctype."""
        if not frappe.db.exists("DocType", doctype):
            return []
        items = frappe.get_all(doctype, fields=["name"], limit_page_length=0)
        return [i["name"] for i in items]

    # Get options from the child doctypes [web:3]
    options = {
        "zone": get_items("Zone Items"),
        "region": get_items("Region Items"),
        "state": get_items("State Items"),
        "district": get_items("District Items"),
        "sol_id": get_items("Sol Items"),
        "product": get_items("Product Items"),
        "source": get_items("Source Items"),
    }

    return options


@frappe.whitelist()
def get_preference_detail(user, report_type=None):
    """Get existing Report Preference for user + report_type, or return empty structure."""
    
    if not user:
        return None

    full_name = frappe.db.get_value("User", user, "full_name")

    filters = {"user": user}
    if report_type:
        filters["report_type"] = report_type

    pref_name = frappe.db.get_value("Report Preference", filters, "name")

    if pref_name:
        doc = frappe.get_doc("Report Preference", pref_name)
        return {
            "name": doc.name,
            "user": doc.user,
            "full_name": full_name,
            "report_type": doc.report_type,
            "zone": [r.zone for r in doc.zone] if doc.zone else [],
            "region": [r.region for r in doc.region] if doc.region else [],
            "state": [r.state for r in doc.state] if doc.state else [],
            "district": [r.district for r in doc.district] if doc.district else [],
            "sol_id": [r.sol_id for r in doc.sol_id] if doc.sol_id else [],
            "product": [r.product for r in doc.product] if doc.product else [],
            "source": [r.source for r in doc.source] if doc.source else [],
        }

    return {
        "name": None,
        "user": user,
        "full_name": full_name,
        "report_type": report_type or "",
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
    """Auto-save/update Report Preference when user changes selections."""
    import json

    if isinstance(data, str):
        data = json.loads(data)

    user = data.get("user")
    report_type = data.get("report_type")

    if not user or not report_type:
        frappe.throw(_("User and Report Type are required"))

    # Check if preference exists [web:37]
    filters = {"user": user, "report_type": report_type}
    pref_name = frappe.db.get_value("Report Preference", filters, "name")

    if pref_name:
        doc = frappe.get_doc("Report Preference", pref_name)
    else:
        doc = frappe.new_doc("Report Preference")
        doc.user = user
        doc.report_type = report_type

    # Clear existing child tables
    doc.zone = []
    doc.region = []
    doc.state = []
    doc.district = []
    doc.sol_id = []
    doc.product = []
    doc.source = []

    # Populate child tables from selections
    for z in data.get("zone", []):
        doc.append("zone", {"zone": z})
    for r in data.get("region", []):
        doc.append("region", {"region": r})
    for s in data.get("state", []):
        doc.append("state", {"state": s})
    for d in data.get("district", []):
        doc.append("district", {"district": d})
    for sol in data.get("sol_id", []):
        doc.append("sol_id", {"sol_id": sol})
    for p in data.get("product", []):
        doc.append("product", {"product": p})
    for src in data.get("source", []):
        doc.append("source", {"source": src})

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"success": True, "name": doc.name}
