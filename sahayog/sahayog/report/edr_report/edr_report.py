import frappe
from frappe import _
import csv
import io


ALLOWED_ROLES = {"CBS Support Executive", "CBS Support Manager"}


def _has_report_access(user):
	roles = set(frappe.get_roles(user))
	if user == "Administrator" or "System Manager" in roles:
		return True
	if roles & ALLOWED_ROLES:
		return True
	dept = frappe.db.get_value("Employee", {"user_id": user}, "department")
	return dept == "Information Technology"


def execute(filters=None):
	filters = filters or {}
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": "Employee Number", "fieldname": "employee_number", "fieldtype": "Data", "width": 130},
		{"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 180},
		{"label": "Gender", "fieldname": "gender", "fieldtype": "Data", "width": 90},
		{"label": "Date of Birth", "fieldname": "date_of_birth", "fieldtype": "Date", "width": 110},
		{"label": "Date of Joining", "fieldname": "date_of_joining", "fieldtype": "Date", "width": 120},
		{"label": "Mobile", "fieldname": "cell_number", "fieldtype": "Data", "width": 120},
		{"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 150},
		{"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 150},
		{"label": "SOL ID", "fieldname": "sol_id", "fieldtype": "Data", "width": 90},
		{"label": "Zone", "fieldname": "custom_zone", "fieldtype": "Data", "width": 100},
		{"label": "Region", "fieldname": "custom_region", "fieldtype": "Data", "width": 100},
		{"label": "District", "fieldname": "custom_district", "fieldtype": "Data", "width": 120},
		{"label": "Division", "fieldname": "custom_division", "fieldtype": "Data", "width": 130},
	]


def get_data(filters):
	if not _has_report_access(frappe.session.user):
		frappe.throw(_("You don't have permission to get a report on: Employee"))

	conditions = ["IFNULL(e.designation, '') != 'Peon'", "IFNULL(e.status, '') NOT IN ('Inactive', 'Left', 'Suspended')"]

	if filters.get("from_date"):
		conditions.append("e.date_of_joining >= %(from_date)s")
	if filters.get("to_date"):
		conditions.append("e.date_of_joining <= %(to_date)s")
	if filters.get("zone"):
		conditions.append("e.custom_zone = %(zone)s")
	if filters.get("branch"):
		conditions.append("e.sahayog_branch = %(branch)s")
	if filters.get("designation"):
		conditions.append("e.designation = %(designation)s")

	where_clause = "WHERE " + " AND ".join(conditions)

	return frappe.db.sql(
		f"""
		SELECT
			e.employee_number, e.employee_name, e.gender, e.date_of_birth,
			e.date_of_joining, e.cell_number, e.designation, e.branch,
			e.sol_id, e.custom_zone, e.custom_region, e.custom_district,
			e.custom_division
		FROM `tabEmployee` e
		{where_clause}
		ORDER BY e.date_of_joining DESC, e.employee_name ASC
		""",
		filters,
		as_dict=True,
	)


@frappe.whitelist()
def download_csv(filters=None):
	if not _has_report_access(frappe.session.user):
		frappe.throw(_("You don't have permission to get a report on: Employee"))

	filters = frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
	data = get_data(filters)
	columns = [c["fieldname"] for c in get_columns()]
	headers = [c["label"] for c in get_columns()]

	output = io.StringIO()
	writer = csv.writer(output)
	writer.writerow(headers)
	for row in data:
		writer.writerow([row.get(col, "") for col in columns])

	return output.getvalue()
