import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {"label": _("Full Name"), "fieldname": "full_name", "fieldtype": "Data", "width": 180},
        {"label": _("Zones"), "fieldname": "zones", "fieldtype": "Data", "width": 200},
        {"label": _("Regions"), "fieldname": "regions", "fieldtype": "Data", "width": 200},
        {"label": _("SOL IDs"), "fieldname": "sol_ids", "fieldtype": "Data", "width": 200},
        {"label": _("Products"), "fieldname": "products", "fieldtype": "Data", "width": 200},
        {"label": _("Sources"), "fieldname": "sources", "fieldtype": "Data", "width": 200},
    ]

def get_data(filters):
    report_filters = {}
    if filters.get("user"):
        report_filters["user"] = filters.get("user")

    # If child table filters are provided, we need to find parents that have these children
    if filters.get("zone") or filters.get("region") or filters.get("sol_id"):
        parent_names = set()
        
        if filters.get("zone"):
            zones = frappe.get_all("Zone Items", filters={"zone": filters.get("zone")}, pluck="parent")
            parent_names.update(zones)
        
        if filters.get("region"):
            regions = frappe.get_all("Region Items", filters={"region": filters.get("region")}, pluck="parent")
            if parent_names:
                parent_names = parent_names.intersection(set(regions))
            else:
                parent_names.update(regions)
        
        if filters.get("sol_id"):
            sol_ids = frappe.get_all("Sol Items", filters={"sol_id": filters.get("sol_id")}, pluck="parent")
            if parent_names:
                parent_names = parent_names.intersection(set(sol_ids))
            else:
                parent_names.update(sol_ids)

        if not parent_names:
            return []
        
        report_filters["name"] = ["in", list(parent_names)]

    # Fetch main records
    preferences = frappe.get_all("Report Preference",
        filters=report_filters,
        fields=["name", "full_name"],
        order_by="modified desc"
    )

    if not preferences:
        return []

    # Pre-fetch all child table data to avoid N+1 queries
    child_tables = {
        "zone": "Zone Items",
        "region": "Region Items",
        "sol_id": "Sol Items",
        "product": "Product Items",
        "source": "Source Items"
    }

    fetched_parent_names = [p.name for p in preferences]
    all_child_data = {}

    for field, doctype in child_tables.items():
        child_records = frappe.get_all(doctype, 
            filters={"parent": ["in", fetched_parent_names]},
            fields=["parent", field],
            order_by="idx"
        )
        for d in child_records:
            p_name = d.parent
            val = d.get(field)
            if p_name not in all_child_data:
                all_child_data[p_name] = {}
            if field not in all_child_data[p_name]:
                all_child_data[p_name][field] = []
            if val:
                all_child_data[p_name][field].append(str(val))

    data = []
    for pref in preferences:
        row = {
            "full_name": pref.full_name,
        }

        pref_child_data = all_child_data.get(pref.name, {})
        
        row["zones"] = ", ".join(pref_child_data.get("zone", []))
        row["regions"] = ", ".join(pref_child_data.get("region", []))
        row["sol_ids"] = ", ".join(pref_child_data.get("sol_id", []))
        row["products"] = ", ".join(pref_child_data.get("product", []))
        row["sources"] = ", ".join(pref_child_data.get("source", []))

        data.append(row)

    return data
