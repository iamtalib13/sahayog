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

@frappe.whitelist()
def get_dashboard_data():
    user = frappe.session.user
    is_admin = "System Manager" in frappe.get_roles(user) or user == "Administrator"
    filters = {}
    if not is_admin:
        filters["owner"] = user

    # 1. Fetch exact total stats across ALL database records
    where_conditions = []
    values = {}
    if not is_admin:
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

    # 2. Fetch recent 50 records for display table
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
        limit=50,
    )

    return {
        "records": records,
        "stats": {
            "total_activities": stats_res.total_activities,
            "total_cost": float(stats_res.total_cost or 0),
            "total_units": int(stats_res.total_units or 0),
            "done_count": int(stats_res.done_count or 0),
            "cancelled_count": int(stats_res.cancelled_count or 0),
        },
        "is_admin": is_admin,
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











