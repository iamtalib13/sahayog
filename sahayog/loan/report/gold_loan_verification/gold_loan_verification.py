import frappe
from frappe import _
from frappe.utils import flt
import csv
import io



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
		{"label": _("Valuer"), "fieldname": "valuer", "fieldtype": "Link", "options": "Valuer Master", "width": 140},
		{"label": _("Packet No."), "fieldname": "packet_number", "fieldtype": "Data", "width": 110},
		{"label": _("Gold Item"), "fieldname": "article_type", "fieldtype": "Data", "width": 160},
		{"label": _("Gross Weight (g)"), "fieldname": "gross_weight", "fieldtype": "Float", "width": 120},
		{"label": _("Stone/Deduction Weight (g)"), "fieldname": "deduction", "fieldtype": "Float", "width": 150},
		{"label": _("Net Weight – System (g)"), "fieldname": "net_weight", "fieldtype": "Float", "width": 150},
		{"label": _("Net Weight – Physical (g)"), "fieldname": "physical_net_weight", "fieldtype": "Float", "width": 150},
		{"label": _("Weight Difference (g)"), "fieldname": "weight_diff", "fieldtype": "Float", "width": 140},
		{"label": _("Purity"), "fieldname": "purity", "fieldtype": "Data", "width": 120},
		{"label": _("Rate per Gram (₹)"), "fieldname": "valuation_rate_per_gram", "fieldtype": "Data", "width": 140},
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
			la.valuer,
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
	grouped_records = {}

	for r in records:
		loan_name = r.get("name")
		if loan_name not in grouped_records:
			grouped_records[loan_name] = {
				"name": loan_name,
				"loan_account_no": r.get("loan_account_no"),
				"customer_name": r.get("customer_name"),
				"valuer": r.get("valuer"),
				"packet_number": r.get("packet_number"),
				"articles": [],
				"purities": [],
				"rates": [],
				"gross_weight": 0.0,
				"deduction": 0.0,
				"net_weight": 0.0,
				"valuation": 0.0,
				"total_gross_weight": r.get("total_gross_weight") or 0.0,
				"total_deduction": r.get("total_deduction") or 0.0,
				"total_net_weight": r.get("total_net_weight") or 0.0,
				"total_valuation": r.get("total_valuation") or 0.0,
				"sanctioned_loan_amount": r.get("sanctioned_loan_amount"),
				"branch_code": r.get("branch_code"),
				"status": r.get("status"),
			}

		item = grouped_records[loan_name]
		if r.get("article_type"):
			item["articles"].append(str(r.get("article_type")).strip())
		if r.get("purity"):
			purity_str = str(r.get("purity")).strip()
			if purity_str not in item["purities"]:
				item["purities"].append(purity_str)
		if r.get("valuation_rate_per_gram"):
			rate_str = str(r.get("valuation_rate_per_gram")).strip()
			if rate_str not in item["rates"]:
				item["rates"].append(rate_str)

		item["gross_weight"] += float(r.get("gross_weight") or 0.0)
		item["deduction"] += float(r.get("deduction") or 0.0)
		item["net_weight"] += float(r.get("net_weight") or 0.0)
		item["valuation"] += float(r.get("valuation") or 0.0)

	sr = 1
	for loan_name, item in grouped_records.items():
		gross = item["total_gross_weight"] if item["total_gross_weight"] > 0 else item["gross_weight"]
		ded = item["total_deduction"] if item["total_deduction"] > 0 else item["deduction"]
		net = item["total_net_weight"] if item["total_net_weight"] > 0 else item["net_weight"]
		val = item["total_valuation"] if item["total_valuation"] > 0 else item["valuation"]

		data.append({
			"sr_no": sr,
			"name": item["name"],
			"loan_account_no": item["loan_account_no"],
			"customer_name": item["customer_name"],
			"valuer": item["valuer"],
			"packet_number": item["packet_number"],
			"article_type": ", ".join(item["articles"]) if item["articles"] else "",
			"gross_weight": flt(gross, 3),
			"deduction": flt(ded, 3),
			"net_weight": flt(net, 3),
			"physical_net_weight": None,
			"weight_diff": 0.0,
			"purity": ", ".join(item["purities"]) if item["purities"] else "",
			"valuation_rate_per_gram": ", ".join(item["rates"]) if item["rates"] else "",
			"valuation": flt(val, 2),
			"physical_valuation": None,
			"valuation_diff": 0.0,
			"sanctioned_loan_amount": item["sanctioned_loan_amount"],
			"branch_code": item["branch_code"],
			"status": item["status"],
		})
		sr += 1

	return data

@frappe.whitelist()
def download_csv(filters=None):
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