

from frappe import _
# Import the original get_data if available. Adjust the import path as needed.
from erpnext.projects.doctype.project.project_dashboard import get_data as original_get_data


def get_data(data=None):
    # Call the original get_data() without any parameters since it doesn't accept any.
    original = original_get_data() if callable(original_get_data) else {}

    # Ensure non_standard_fieldnames dictionary exists
    original.setdefault("non_standard_fieldnames", {})
    # Merge custom mappings for external links:
    # "Request for Quotation" is mapped to "custom_project" field.
    # "Supplier Quotation" is mapped to "custom_supplier_quotation" field.
    original["non_standard_fieldnames"].update({
        "Request for Quotation": "custom_project",
        "Supplier Quotation": "project",
    })

    # Create a custom connection group under the label "Supplier".
    supplier_group = {
        "label": _("Supplier"),
        "items": [
            "Request for Quotation",  # Existing RFQ connection.
            "Supplier Quotation"       # New Supplier Quotation connection.
        ],
    }

    # Ensure that the transactions list exists and append the custom supplier group.
    original.setdefault("transactions", [])
    original["transactions"].append(supplier_group)

    return original
