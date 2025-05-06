import frappe

@frappe.whitelist()
def execute():
    frappe.db.set_value("User", {"gender": ["!=", ""]}, "gender", "")
    frappe.db.commit()
