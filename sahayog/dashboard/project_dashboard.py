from frappe import _
from erpnext.projects.doctype.project.project_dashboard import get_data as original_get_data


def get_data(data=None):
    # Get original dashboard data
    original = original_get_data() if callable(original_get_data) else {}

    # Ensure required keys
    original.setdefault("transactions", [])
    original.setdefault("non_standard_fieldnames", {})
    original.setdefault("internal_links", {})

    # Existing mappings
    original["non_standard_fieldnames"].update({
        "Request for Quotation": "custom_project",
        "Supplier Quotation": "project",
    })

    # Supplier mapping via Project’s child table
    original["internal_links"].update({
        "Supplier": ["custom_supplier_details", "supplier"]
    })

    # Custom Supplier group
    supplier_group = {
        "label": _("Supplier"),
        "items": [
            "Request for Quotation",
            "Supplier Quotation",
            "Supplier"
        ],
    }
    original["transactions"].append(supplier_group)

    return original
