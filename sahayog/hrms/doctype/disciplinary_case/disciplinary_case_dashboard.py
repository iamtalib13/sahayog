from frappe import _

def get_data():
    return {
        "fieldname": "case_id",
        "non_standard_fieldnames": {"Response to SCN": "case_id"},
        "transactions": [
            {
                "label": _("Case Workflow"),
                "items": ["Response to SCN"],
            }
        ],
    }
