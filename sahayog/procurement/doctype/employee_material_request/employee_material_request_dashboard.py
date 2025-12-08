from frappe import _


def get_data():
    return {
        "fieldname": "name",
        "non_standard_fieldnames": {
            "Stock Entry": "custom_material_request_doctype",  # your custom Link field
            "Asset Movement": "custom_reference_name",
        },
        "transactions": [
            {
                "label": _("Stock"),
                "items": ["Stock Entry"],
                "actions": [
                    {
                        "label": _("Create Stock Entry"),
                        # Set custom link field to current EMR name
                        "action": "frappe.new_doc('Stock Entry', { 'custom_material_request': Employee Material Request, 'employee_material_request': doc.name })",
                    }
                ],
            },
     # ------------------- ASSET MOVEMENT -------------------
            {
                "label": _("Asset"),
                "items": ["Asset Movement"],
                "actions": [
                    {
                        "label": _("Create Asset Movement"),
                        "action": "frappe.new_doc('Asset Movement', {'custom_reference_doctype': 'Employee Material Request','custom_reference_name': cur_frm.doc.name,'purpose': 'Issue' })",
                    }
                ],
            },

        ],
    }
