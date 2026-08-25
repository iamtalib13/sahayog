# Copyright (c) 2026, Administrator and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data

def get_columns():
	return [
		{
			"label": _("Date"),
			"fieldname": "date",
			"fieldtype": "Date",
			"width": 110
		},
		{
			"label": _("Zone"),
			"fieldname": "zone",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("Region"),
			"fieldname": "region",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("Branch SOL ID"),
			"fieldname": "branch",
			"fieldtype": "Link",
			"options": "Sahayog Branch",
			"width": 120
		},
		{
			"label": _("Branch Name"),
			"fieldname": "branch_name",
			"fieldtype": "Data",
			"width": 150
		},
		{
			"label": _("Branch Code"),
			"fieldname": "branch_code",
			"fieldtype": "Data",
			"width": 110
		},
		{
			"label": _("Branch Category"),
			"fieldname": "branch_category",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"label": _("Product Focus"),
			"fieldname": "product_focus",
			"fieldtype": "Data",
			"width": 130
		},
		{
			"label": _("Target Segment"),
			"fieldname": "target_segment",
			"fieldtype": "Data",
			"width": 130
		},
		{
			"label": _("Location / Place"),
			"fieldname": "location_place",
			"fieldtype": "Data",
			"width": 130
		},
		{
			"label": _("Activity Type"),
			"fieldname": "activity_type",
			"fieldtype": "Data",
			"width": 130
		},
		{
			"label": _("Paid / Unpaid"),
			"fieldname": "paid_unpaid",
			"fieldtype": "Data",
			"width": 110
		},
		{
			"label": _("Estimated Cost"),
			"fieldname": "estimated_cost",
			"fieldtype": "Currency",
			"width": 120
		},
		{
			"label": _("Units (Accounts)"),
			"fieldname": "units_accounts",
			"fieldtype": "Int",
			"width": 120
		},
		{
			"label": _("Status"),
			"fieldname": "status",
			"fieldtype": "Data",
			"width": 100
		},
		{
			"label": _("Remark"),
			"fieldname": "remark",
			"fieldtype": "Small Text",
			"width": 200
		}
	]

def get_data(filters):
	conditions = []
	values = {}

	if filters.get("from_date"):
		conditions.append("date >= %(from_date)s")
		values["from_date"] = filters.get("from_date")

	if filters.get("to_date"):
		conditions.append("date <= %(to_date)s")
		values["to_date"] = filters.get("to_date")

	if filters.get("zone"):
		conditions.append("zone = %(zone)s")
		values["zone"] = filters.get("zone")

	if filters.get("region"):
		conditions.append("region = %(region)s")
		values["region"] = filters.get("region")

	if filters.get("branch"):
		conditions.append("branch = %(branch)s")
		values["branch"] = filters.get("branch")

	if filters.get("status"):
		conditions.append("status = %(status)s")
		values["status"] = filters.get("status")

	where_clause = ""
	if conditions:
		where_clause = " WHERE " + " AND ".join(conditions)

	query = f"""
		SELECT
			date, zone, region, branch, branch_name, branch_code,
			branch_category, product_focus, target_segment, location_place,
			activity_type, paid_unpaid, estimated_cost, units_accounts,
			status, remark
		FROM
			`tabMAC Activity`
		{where_clause}
		ORDER BY
			date DESC
	"""

	return frappe.db.sql(query, values, as_dict=True)
