import frappe

def execute():
    if not frappe.db.exists("Custom Field", "Asset-serial_no"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Asset",
            "label": "Serial No",
            "fieldname": "serial_no",
            "fieldtype": "Link",
            "options": "Serial No",
            "insert_after": "cost_center",
        }).insert()
        frappe.db.commit()