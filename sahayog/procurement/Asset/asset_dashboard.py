from frappe import _

def get_data(data=None):

    return {
        "fieldname": "name",

        "non_standard_fieldnames": {
            "Asset Movement": "asset",
            "Asset Maintenance": "asset_name",
            "Asset Repair": "asset",
            "Asset Activity": "asset",
            "Asset Value Adjustment": "asset",
            "Asset Depreciation Schedule": "asset",
            "Journal Entry": "reference_name",
            "Asset Capitalization": "asset",
            "Asset Key": "asset"
        },

        "transactions": [
            {
                "label": _("Movement"),
                "items": ["Asset Movement"]
            },
            {
                "label": _("Maintenance"),
                "items": ["Asset Maintenance"]
            },
            {
                "label": _("Repair"),
                "items": ["Asset Repair"]
            },
            {
                "label": _("Activity"),
                "items": ["Asset Activity"]
            },
            {
                "label": _("Value"),
                "items": ["Asset Value Adjustment"]
            },
            {
                "label": _("Depreciation"),
                "items": ["Asset Depreciation Schedule"]
            },
            {
                "label": _("Journal Entry"),
                "items": ["Journal Entry"]
            },
            {
                "label": _("Asset Capitalization"),
                "items": ["Asset Capitalization"]
            },
            {
                "label": _("Keys"),
                "items": ["Asset Key"]
            }
        ]
    }
