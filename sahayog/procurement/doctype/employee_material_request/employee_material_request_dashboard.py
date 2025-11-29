from frappe import _


def get_data():
    return {
        "fieldname": "name",
        "non_standard_fieldnames": {
            "Stock Entry": "custom_material_request",
            "Asset Movement": "reference_name",
        },
        "transactions": [
            {
                "label": _("Stock"),
                "items": ["Stock Entry"],
                "actions": [
                    {
                        "label": _("Create Stock Entry"),
                        "action": "frappe.new_doc('Stock Entry', { 'custom_material_request': doc.name })",
                    }
                ],
            },
            {
                "label": _("Asset"),
                "items": ["Asset Movement"],
                "actions": [
                    {
                        "label": _("Create Asset Movement"),
                        "action": "frappe.new_doc('Asset Movement', { 'reference_doctype': 'Employee Material Request', 'reference_name': doc.name })",
                    }
                ],
            },
        ],
    }
