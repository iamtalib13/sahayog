import frappe

def execute():
    if frappe.db.exists("Custom DocPerm", {"parent": "Lead", "role": "Branch Manager"}):
        return

    doc = frappe.get_doc({
        "doctype": "Custom DocPerm",
        "parent": "Lead",
        "parenttype": "DocType",
        "parentfield": "permissions",
        "role": "Branch Manager",
        "permlevel": 0,
        "read": 1,
        "write": 1,
        "create": 1,
        "delete": 0,
        "submit": 0,
        "cancel": 0,
        "amend": 0,
        "email": 0,
        "print": 0,
        "report": 0,
        "share": 0,
        "export": 0,
        "import": 0,
        "select": 0,
    })
    doc.insert()
