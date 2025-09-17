import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    fields = {
        "Material Request Item": [
            {
                "fieldname": "custom_custom_metrial_transfre_purches_status",
                "label": "Purches Status",
                "fieldtype": "Select",
                "options": "Pending\nDispatch",
                "insert_after": "qty",   # 'qty' is typically 'Quantity', adjust if needed!
                "in_list_view": 1,
                "mandatory": 1,
                "module": "Procurement",
            }
        ]
    }
    create_custom_fields(fields)
