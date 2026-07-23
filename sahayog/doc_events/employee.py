from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import getdate, add_days


def _ensure_link(doc, fieldname, target_doctype, label_field, name_prefix=None):
    val = doc.get(fieldname)
    if not val:
        return
    val = val.strip()
    if not val:
        return
    clean = val.replace(" ", "").upper()
    if name_prefix and not clean.startswith(name_prefix):
        clean = name_prefix + clean
    if not frappe.db.exists(target_doctype, clean):
        frappe.get_doc({
            "doctype": target_doctype,
            label_field: clean,
        }).insert(ignore_permissions=True)
    doc.set(fieldname, clean)


def custom_division_sync(doc, method):
    _ensure_link(doc, "custom_division", "Division", "division")


def custom_zone_sync(doc, method):
    _ensure_link(doc, "custom_zone", "Zone", "zone", "ZONE-")


def custom_region_sync(doc, method):
    _ensure_link(doc, "custom_region", "Region", "region", "REGION-")


def branch_sync(doc, method):
    _ensure_link(doc, "branch", "Branch", "branch")


def split_name_sync(doc, method):
    fn = doc.get("first_name")
    mn = doc.get("middle_name")
    ln = doc.get("last_name")
    if not fn:
        return
    parts = [p for p in fn.strip().split() if p]
    if len(parts) == 1:
        return
    if mn or ln:
        return
    if len(parts) == 2:
        doc.first_name = parts[0]
        doc.last_name = parts[1]
    elif len(parts) == 3:
        doc.first_name = parts[0]
        doc.middle_name = parts[1]
        doc.last_name = parts[2]
    elif len(parts) == 4:
        doc.first_name = " ".join(parts[:3])
        doc.last_name = parts[3]


def designation_sync(doc, method):
    _ensure_link(doc, "designation", "Designation", "designation_name")


def department_sync(doc, method):
    val = doc.get("department")
    if not val:
        return
    val = val.strip()
    if not val:
        return
    title_dep = val.title()
    existing = frappe.db.get_value("Department", {"department_name": title_dep}, "name") or frappe.db.get_value("Department", {"department_name": val}, "name")
    if existing:
        doc.department = existing
    else:
        new = frappe.get_doc({
            "doctype": "Department",
            "department_name": title_dep,
        }).insert(ignore_permissions=True)
        doc.department = new.name


def set_confirmation_date(doc, method):
    """Automatically set final_confirmation_date to 90 days after date_of_joining if empty."""
    if doc.date_of_joining and not doc.final_confirmation_date:
        doc.final_confirmation_date = add_days(doc.date_of_joining, 90)

def emp_enable_disable(doc, method):
    status = doc.status
    user = doc.user_id

    # Validate user_id
    if not user:
        frappe.throw("User ID is not set for this Employee.")

    if not frappe.db.exists("User", user):
        frappe.throw(f"User {user} does not exist.")

    try:
        if status == "Active":
            frappe.db.set_value('User', user, 'enabled', 1, update_modified=False)
            frappe.msgprint(f"User {user} is now enabled.")
        elif status == "Inactive":
            frappe.db.set_value('User', user, 'enabled', 0, update_modified=False)
            frappe.msgprint(f"User {user} is now disabled.")
        else:
            frappe.msgprint(f"Status '{status}' is not recognized. No changes applied.")
        
        # Commit the transaction to the database
        frappe.db.commit()
    
    except Exception as e:
        # Log the error in Error Log doctype and throw an exception
        frappe.log_error(f"Failed to update user status for {user}: {str(e)}", "User Status Update Error")
        frappe.throw("An error occurred while updating the user status.")

