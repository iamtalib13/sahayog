# Copyright (c) 2026, Administrator and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
	filters = filters or {}
	columns = get_columns()
	data = get_data(filters)
	return columns, data

def get_columns():
	return [
		{
			"label": _("Lead ID"),
			"fieldname": "name",
			"fieldtype": "Link",
			"options": "Agent Lead",
			"width": 140
		},
		{
			"label": _("Applied Date"),
			"fieldname": "creation",
			"fieldtype": "Date",
			"width": 110
		},
		{
			"label": _("Full Name"),
			"fieldname": "full_name",
			"fieldtype": "Data",
			"width": 160
		},
		{
			"label": _("Contact Number"),
			"fieldname": "mobile_no",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("Alternate Number"),
			"fieldname": "alternate_number",
			"fieldtype": "Data",
			"width": 130
		},
		{
			"label": _("Email ID"),
			"fieldname": "email_id",
			"fieldtype": "Data",
			"width": 160
		},
		{
			"label": _("State"),
			"fieldname": "state",
			"fieldtype": "Data",
			"width": 130
		},
		{
			"label": _("City / District"),
			"fieldname": "city_district",
			"fieldtype": "Data",
			"width": 130
		},
		{
			"label": _("Area PIN Code"),
			"fieldname": "pincode",
			"fieldtype": "Data",
			"width": 110
		},
		{
			"label": _("Assigned Sahayog Branch"),
			"fieldname": "branch",
			"fieldtype": "Link",
			"options": "Sahayog Branch",
			"width": 180
		},
		{
			"label": _("Occupation"),
			"fieldname": "occupation",
			"fieldtype": "Data",
			"width": 140
		},
		{
			"label": _("Resident Status"),
			"fieldname": "resident_status",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("Age"),
			"fieldname": "age",
			"fieldtype": "Int",
			"width": 80
		},
		{
			"label": _("Gender"),
			"fieldname": "gender",
			"fieldtype": "Data",
			"width": 90
		},
		{
			"label": _("Marital Status"),
			"fieldname": "marital_status",
			"fieldtype": "Data",
			"width": 110
		},
		{
			"label": _("Highest Qualification"),
			"fieldname": "highest_qualification",
			"fieldtype": "Data",
			"width": 150
		},
		{
			"label": _("Preferred Working Hours"),
			"fieldname": "preferred_working_hours",
			"fieldtype": "Data",
			"width": 150
		},
		{
			"label": _("Lead Source"),
			"fieldname": "lead_source",
			"fieldtype": "Data",
			"width": 150
		},
		{
			"label": _("Status"),
			"fieldname": "status",
			"fieldtype": "Data",
			"width": 110
		},
		{
			"label": _("Follow-up Remarks"),
			"fieldname": "remarks",
			"fieldtype": "Small Text",
			"width": 200
		}
	]

def get_data(filters):
	conditions = []
	values = {}

	user = frappe.session.user
	roles = frappe.get_roles(user)
	is_admin = "System Manager" in roles or "MIS Admin" in roles or user == "Administrator"

	if not is_admin:
		conditions.append("owner = %(user)s")
		values["user"] = user

	if filters.get("from_date"):
		conditions.append("DATE(creation) >= %(from_date)s")
		values["from_date"] = filters.get("from_date")

	if filters.get("to_date"):
		conditions.append("DATE(creation) <= %(to_date)s")
		values["to_date"] = filters.get("to_date")

	if filters.get("state"):
		conditions.append("state = %(state)s")
		values["state"] = filters.get("state")

	if filters.get("branch"):
		conditions.append("branch = %(branch)s")
		values["branch"] = filters.get("branch")

	if filters.get("status"):
		conditions.append("status = %(status)s")
		values["status"] = filters.get("status")

	if filters.get("occupation"):
		conditions.append("occupation = %(occupation)s")
		values["occupation"] = filters.get("occupation")

	where_clause = ""
	if conditions:
		where_clause = " WHERE " + " AND ".join(conditions)

	query = f"""
		SELECT
			name,
			DATE(creation) as creation,
			full_name,
			mobile_no,
			alternate_number,
			email_id,
			state,
			city_district,
			pincode,
			branch,
			occupation,
			resident_status,
			age,
			gender,
			marital_status,
			highest_qualification,
			preferred_working_hours,
			lead_source,
			status,
			remarks
		FROM
			`tabAgent Lead`
		{where_clause}
		ORDER BY
			creation DESC
	"""

	return frappe.db.sql(query, values, as_dict=True)
