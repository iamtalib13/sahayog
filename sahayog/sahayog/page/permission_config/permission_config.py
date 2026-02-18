# apps/sahayog/sahayog/sahayog/page/permission_config/permission_config.py

import frappe


@frappe.whitelist()
def get_user_bundle(user: str, report_type: str | None = None):
    """Returns: user(full_name), option lists, and existing Report Preference (if any)."""

    full_name = frappe.db.get_value("User", user, "full_name")

    def get_names(doctype):
        return frappe.get_all(doctype, pluck="name", limit_page_length=0)

    options = {
        "zone": [{"value": n, "label": n} for n in get_names("Zone Items")],
        "region": [{"value": n, "label": n} for n in get_names("Region Items")] if frappe.db.exists("DocType", "Region Items") else [],
        "state": [{"value": n, "label": n} for n in get_names("State Items")],
        "district": [{"value": n, "label": n} for n in get_names("District Items")],
        "sol_id": [{"value": n, "label": n} for n in get_names("Sol Items")],
        "product": [{"value": n, "label": n} for n in get_names("Product Items")],
        "source": [{"value": n, "label": n} for n in get_names("Source Items")],
    }

    pref = None
    if report_type:
        pref_name = frappe.db.get_value(
            "Report Preference",
            {"user": user, "report_type": report_type},
            "name",
        )
        if pref_name:
            pref = frappe.get_doc("Report Preference", pref_name).as_dict()

    return {
        "user": {"id": user, "full_name": full_name},
        "options": options,
        "preference": pref,
    }
