import frappe

def set_lead_owner_branch(doc, method):
    if frappe.session.user != "Administrator":  # Check if the user is not admin
        if not doc.custom_lead_owner_branch:
            branch = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "branch")
            if branch:
                doc.custom_lead_owner_branch = branch