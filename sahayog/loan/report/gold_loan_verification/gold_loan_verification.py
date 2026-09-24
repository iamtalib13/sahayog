import frappe
from frappe import _


def execute(filters=None):
	filters = filters or {}
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": _("Sr. No."), "fieldname": "sr_no", "fieldtype": "Int", "width": 60},
		{"label": _("Loan Application"), "fieldname": "name", "fieldtype": "Link", "options": "Loan Application", "width": 160},
		{"label": _("Loan A/c No."), "fieldname": "loan_account_no", "fieldtype": "Data", "width": 140},
		{"label": _("Customer Name"), "fieldname": "customer_name", "fieldtype": "Data", "width": 180},
		{"label": _("Packet No."), "fieldname": "packet_number", "fieldtype": "Data", "width": 110},
		{"label": _("Gold Item"), "fieldname": "article_type", "fieldtype": "Data", "width": 140},
		{"label": _("Gross Weight (g)"), "fieldname": "gross_weight", "fieldtype": "Float", "width": 120},
		{"label": _("Stone/Deduction Weight (g)"), "fieldname": "deduction", "fieldtype": "Float", "width": 150},
		{"label": _("Net Weight – System (g)"), "fieldname": "net_weight", "fieldtype": "Float", "width": 150},
		{"label": _("Net Weight – Physical (g)"), "fieldname": "physical_net_weight", "fieldtype": "Float", "width": 150},
		{"label": _("Weight Difference (g)"), "fieldname": "weight_diff", "fieldtype": "Float", "width": 140},
		{"label": _("Purity"), "fieldname": "purity", "fieldtype": "Data", "width": 90},
		{"label": _("Rate per Gram (₹)"), "fieldname": "valuation_rate_per_gram", "fieldtype": "Currency", "width": 130},
		{"label": _("Valuation as per System (₹)"), "fieldname": "valuation", "fieldtype": "Currency", "width": 160},
		{"label": _("Physical Valuation (₹)"), "fieldname": "physical_valuation", "fieldtype": "Currency", "width": 150},
		{"label": _("Valuation Difference (₹)"), "fieldname": "valuation_diff", "fieldtype": "Currency", "width": 150},
		{"label": _("Sanctioned Amount (₹)"), "fieldname": "sanctioned_loan_amount", "fieldtype": "Currency", "width": 150},
		{"label": _("Branch"), "fieldname": "branch_code", "fieldtype": "Link", "options": "Sahayog Branch", "width": 130},
		{"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 110},
	]


def get_data(filters):
	conditions = ["la.docstatus < 2"]
	if filters.get("from_date"):
		conditions.append("la.creation >= %(from_date)s")
	if filters.get("to_date"):
		conditions.append("la.creation <= %(to_date)s")
	if filters.get("branch_code"):
		conditions.append("la.branch_code = %(branch_code)s")
	if filters.get("status"):
		conditions.append("la.status = %(status)s")

	where_clause = "WHERE " + " AND ".join(conditions)

	records = frappe.db.sql(
		f"""
		SELECT
			la.name,
			la.loan_account_no,
			la.customer_name,
			la.packet_number,
			la.total_gross_weight,
			la.total_deduction,
			la.total_net_weight,
			la.total_valuation,
			la.sanctioned_loan_amount,
			la.branch_code,
			la.status,
			orn.article_type,
			orn.gross_weight,
			orn.deduction,
			orn.net_weight,
			orn.purity,
			orn.valuation_rate_per_gram,
			orn.valuation
		FROM `tabLoan Application` la
		LEFT JOIN `tabLoan Ornament` orn ON orn.parent = la.name
		{where_clause}
		ORDER BY la.creation DESC
		""",
		filters,
		as_dict=True,
	)

	data = []
	sr = 1
	for r in records:
		data.append({
			"sr_no": sr,
			"name": r.get("name"),
			"loan_account_no": r.get("loan_account_no"),
			"customer_name": r.get("customer_name"),
			"packet_number": r.get("packet_number"),
			"article_type": r.get("article_type"),
			"gross_weight": r.get("gross_weight") or r.get("total_gross_weight"),
			"deduction": r.get("deduction") or r.get("total_deduction"),
			"net_weight": r.get("net_weight") or r.get("total_net_weight"),
			"physical_net_weight": None,
			"weight_diff": 0.0,
			"purity": r.get("purity"),
			"valuation_rate_per_gram": r.get("valuation_rate_per_gram"),
			"valuation": r.get("valuation") or r.get("total_valuation"),
			"physical_valuation": None,
			"valuation_diff": 0.0,
			"sanctioned_loan_amount": r.get("sanctioned_loan_amount"),
			"branch_code": r.get("branch_code"),
			"status": r.get("status"),
		})
		sr += 1

	return data
