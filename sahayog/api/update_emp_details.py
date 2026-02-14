import frappe
from frappe import _
from frappe.utils.password import check_password, update_password
import json

@frappe.whitelist(allow_guest=False)
def custom_change_password(old_password: str, new_password: str):
    """Change password for the logged-in user after verifying old password."""
    user = frappe.session.user

    # Validation: Empty fields
    if not old_password or not new_password:
        return {
            "status": "error",
            "message": _("Old and new passwords are required.")
        }

    # Validate old password
    try:
        check_password(user, old_password)
    except frappe.AuthenticationError:
        return {
            "status": "error",
            "message": _("Incorrect old password.")
        }

    # Try updating password
    try:
        update_password(user, new_password)
        return {
            "status": "success",
            "message": _("Password updated successfully.")
        }
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Custom Password Change Failed")
        return {
            "status": "error",
            "message": _("Could not update password. Please try again later.")
        }
    
@frappe.whitelist()
def update_employee_details(employee, data):
    if not frappe.session.user:
        return {"status": "error", "message": _("Not logged in")}

    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            return {"status": "error", "message": _("Invalid data format")}

    emp = frappe.get_doc("Employee", employee)
    if not emp:
        return {"status": "error", "message": _("Employee record not found.")}

    if data.get("company_email") and not data["company_email"].endswith("@sahayogmultistate.com"):
        return {"status": "error", "message": _("Email must end with @sahayogmultistate.com")}

    try:
        allowed_fields = [
            "first_name", "middle_name", "last_name",
            "date_of_birth", "date_of_joining",
            "designation", "department", "branch",
            "custom_zone", "custom_region",
            "cell_number", "company_email",
            "current_address"
        ]

        for field in allowed_fields:
            if field in data:
                value = data[field]
                if field in ["first_name", "middle_name", "last_name"] and value:
                    value = value.upper()
                emp.set(field, value)

        # 🔹 Handle sol_id auto-fetch from Branch
        sol_id = emp.get("sol_id")
        if not sol_id and emp.branch:
            branch_sol_id = frappe.db.get_value("Branch", emp.branch, "sol_id")
            if branch_sol_id:
                emp.sol_id = branch_sol_id
            # Agar branch me bhi sol_id nahi mila, toh warning denge frontend me

        emp.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "status": "success",
            "message": _("Employee details updated successfully."),
            "sol_id": emp.sol_id
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Employee Details Update Failed")
        return {"status": "error", "message": _("Could not update employee details.")}
