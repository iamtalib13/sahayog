import frappe

def execute():
    DOCTYPE = "Employee"

    # جلوگیری duplicate field creation
    if frappe.db.exists("Custom Field", {
        "dt": DOCTYPE,
        "fieldname": "netwin_statement"
    }):
        return

    frappe.get_doc({
        "doctype": "Custom Field",
        "dt": DOCTYPE,
        "label": "Netwin Statement",
        "fieldname": "netwin_statement",
        "fieldtype": "Check",
        "insert_after": "sahayog_branch"
    }).insert(ignore_permissions=True)