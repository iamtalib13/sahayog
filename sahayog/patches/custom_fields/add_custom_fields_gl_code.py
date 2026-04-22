import frappe

def execute():
    DOCTYPE = "Sahayog Branch"

    # جلوگیری duplicate field creation
    if frappe.db.exists("Custom Field", {
        "dt": DOCTYPE,
        "fieldname": "gl_code"
    }):
        return

    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": DOCTYPE,
        "label": "GL Code",
        "fieldname": "gl_code",
        "fieldtype": "Data",
        "insert_after": "branch_opening_date"
    }).insert(ignore_permissions=True)