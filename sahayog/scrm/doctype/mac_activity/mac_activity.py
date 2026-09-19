import os
import requests
import frappe
from frappe.model.document import Document
from frappe import _

class MACActivity(Document):
	def validate(self):
		if self.status == "Cancelled" and not self.remark:
			frappe.throw(_("Remark is mandatory if Status is Cancelled"))
		
		# If Unpaid, reset Estimated Cost to 0
		if self.paid_unpaid == "Unpaid":
			self.estimated_cost = 0

@frappe.whitelist()
def ensure_qr_code():
    file_path = frappe.get_site_path("public", "files", "mac_activity_qr.png")
    if not os.path.exists(file_path):
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        # Generate QR pointing to MAC Activity dashboard URL
        try:
            site_url = frappe.utils.get_url()
            qr_data = f"{site_url}/mac-activity"
            import qrcode
            qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
            qr.add_data(qr_data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            img.save(file_path, format="PNG")
        except Exception as e:
            frappe.log_error(message=str(e), title="MAC QR Generation Failed")

ZONAL_DESIGNATIONS = {"assistant zonal manager", "zonal channel manager", "sr. zonal manager", "asst. zonal manager", "zonal manager"}

def _get_user_zone(user):
    emp = frappe.db.get_value("Employee", {"user_id": user}, ["designation", "custom_zone"], as_dict=True)
    if not emp or not emp.get("custom_zone"):
        return None
    if (emp.get("designation") or "").strip().lower() not in ZONAL_DESIGNATIONS:
        return None
    return emp.get("custom_zone")

@frappe.whitelist()
def get_dashboard_data(start=0, page_length=10):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    is_admin = "System Manager" in roles or "MIS Admin" in roles or user == "Administrator"
    filters = {}
    user_zone = None if is_admin else _get_user_zone(user)
    if not is_admin:
        if user_zone:
            filters["zone"] = user_zone
        else:
            filters["owner"] = user

    try:
        start = int(start)
    except Exception:
        start = 0

    try:
        page_length = int(page_length)
    except Exception:
        page_length = 10

    # 1. Fetch exact total stats across ALL database records
    where_conditions = []
    values = {}
    if not is_admin:
        if user_zone:
            where_conditions.append("zone = %(user_zone)s")
            values["user_zone"] = user_zone
        else:
            where_conditions.append("owner = %(user)s")
            values["user"] = user

    where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""

    stats_query = f"""
        SELECT
            COUNT(name) as total_activities,
            COALESCE(SUM(estimated_cost), 0) as total_cost,
            COALESCE(SUM(units_accounts), 0) as total_units,
            COALESCE(SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END), 0) as done_count,
            COALESCE(SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END), 0) as cancelled_count
        FROM `tabMAC Activity`
        {where_clause}
    """
    stats_res = frappe.db.sql(stats_query, values, as_dict=True)[0]

    total_activities = int(stats_res.total_activities or 0)

    # 2. Fetch paginated records for display table
    records = frappe.get_all(
        "MAC Activity",
        filters=filters,
        fields=[
            "name",
            "date",
            "employee",
            "employee_name",
            "branch_name",
            "product_focus",
            "estimated_cost",
            "units_accounts",
            "status",
            "creation",
        ],
        order_by="creation desc",
        start=start,
        page_length=page_length,
    )

    return {
        "records": records,
        "stats": {
            "total_activities": total_activities,
            "total_cost": float(stats_res.total_cost or 0),
            "total_units": int(stats_res.total_units or 0),
            "done_count": int(stats_res.done_count or 0),
            "cancelled_count": int(stats_res.cancelled_count or 0),
        },
        "is_admin": is_admin,
        "has_more": (start + len(records)) < total_activities,
        "total_count": total_activities
    }

@frappe.whitelist(allow_guest=True)
def get_branch_details(branch):
	if not branch:
		return {}
	branch_doc = frappe.get_doc("Sahayog Branch", branch)
	return {
		"branch": branch_doc.branch,
		"branch_code": branch_doc.branch_code or branch_doc.sol_id,
		"zone": branch_doc.zone,
		"region": branch_doc.region
	}

@frappe.whitelist(allow_guest=True)
def get_employee_details(employee):
	if not employee:
		return {}
	emp = frappe.get_doc("Employee", employee)
	branch_details = {}
	if emp.sahayog_branch:
		branch_details = get_branch_details(emp.sahayog_branch)
	return {
		"employee_id": emp.name,
		"employee_name": emp.employee_name,
		"sahayog_branch": emp.sahayog_branch,
		"branch_details": branch_details
	}

@frappe.whitelist()
def get_logged_in_employee_details():
	user = frappe.session.user
	if user == "Administrator":
		return {}
	employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if not employee:
		return {}
	return get_employee_details(employee)


def get_permission_query_conditions(user=None):
	if not user:
		user = frappe.session.user

	roles = frappe.get_roles(user)
	if "System Manager" in roles or "MIS Admin" in roles or user == "Administrator":
		return ""

	user_zone = _get_user_zone(user)
	if user_zone:
		return f"`tabMAC Activity`.zone = {frappe.db.escape(user_zone)}"

	return f"`tabMAC Activity`.owner = {frappe.db.escape(user)}"


def has_permission(doc, ptype="read", user=None):
	if not user:
		user = frappe.session.user

	roles = frappe.get_roles(user)
	if "System Manager" in roles or "MIS Admin" in roles or user == "Administrator":
		return True

	if ptype in ["read", "write", "submit", "cancel"]:
		if doc.owner == user:
			return True
		user_zone = _get_user_zone(user)
		return bool(user_zone and doc.get("zone") and doc.get("zone") == user_zone)

	return True











