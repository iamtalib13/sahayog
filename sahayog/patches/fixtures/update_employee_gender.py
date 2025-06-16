import frappe

def execute():
    frappe.db.set_value("Employee", {"gender": "F"}, "gender", "Female", update_modified=False)
    frappe.db.set_value("Employee", {"gender": "M"}, "gender", "Male", update_modified=False)
    frappe.db.commit()
