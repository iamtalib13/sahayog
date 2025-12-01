import frappe


def execute():
    if not frappe.db.exists("Custom Field", "Stock Entry-custom_material_request"):
        frappe.get_doc(
            {
                "doctype": "Custom Field",
                "dt": "Stock Entry",
                "fieldname": "custom_material_request",
                "label": "Material Request",
                "fieldtype": "Link",
                "options": "Employee Material Request",
                "insert_after": "stock_entry_type",
            }
        ).insert()
        frappe.db.commit()
