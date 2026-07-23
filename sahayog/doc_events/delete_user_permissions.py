import frappe


def delete_user_permissions(doc, method):
    """Delete User Permission for Employee on User save/update"""

    # Delete related User Permissions
    frappe.db.delete("User Permission", {
        "user": doc.name,
        "allow": "Employee"
    })

