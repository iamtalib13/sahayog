from frappe.model.document import Document


class AccountVerificationLog(Document):
    pass


import json

import frappe
from frappe import _

REPORT_FIELDS = [
	("name", "Log ID"),
	("log_datetime", "Date Time"),
	("user_id", "User"),
	("user_full_name", "User Full Name"),
	("ip_address", "IP Address"),
	("ifsc", "IFSC"),
	("account_masked", "Account (Masked)"),
	("account_name", "Name (as per bank)"),
	("case_id", "Case ID"),
	("status", "Status"),
	("is_valid", "Is Valid"),
	("bank_status_code", "Bank Status Code"),
	("bank_response", "Bank Response"),
	("bank_rrn", "Bank RRN"),
	("status_as_per_source", "Status As Per Source"),
	("from_cache", "Served From Previous Result"),
	("request_id", "Request ID"),
	("error_message", "Error Message"),
]


@frappe.whitelist()
def download_report(filters=None):
	"""Excel report of Account Verification Log (current list filters). System Manager only."""
	if "System Manager" not in frappe.get_roles():
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	from frappe.utils.xlsxutils import make_xlsx

	if isinstance(filters, str):
		filters = json.loads(filters or "[]")

	rows = frappe.get_all(
		"Account Verification Log",
		filters=filters or [],
		fields=[f for f, _l in REPORT_FIELDS],
		order_by="creation desc",
		limit_page_length=0,
	)

	data = [[label for _f, label in REPORT_FIELDS]]
	for r in rows:
		line = []
		for f, _l in REPORT_FIELDS:
			v = r.get(f)
			if f == "from_cache":
				v = "Yes" if v else "No"
			line.append("" if v is None else str(v))
		data.append(line)

	frappe.response["filename"] = "Account_Verification_Log_{0}.xlsx".format(
		frappe.utils.now_datetime().strftime("%Y%m%d_%H%M%S")
	)
	frappe.response["filecontent"] = make_xlsx(data, "Account Verification Log").getvalue()
	frappe.response["type"] = "binary"
