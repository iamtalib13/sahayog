import json

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils.xlsxutils import build_xlsx_response

COLUMNS = [
    ("name", "Log ID"),
    ("user_id", "User"),
    ("user_full_name", "User Name"),
    ("log_datetime", "Date & Time"),
    ("holder_name", "Aadhaar Holder Name"),
    ("aadhaar_masked", "Aadhaar (Masked)"),
    ("status", "Status"),
    ("case_id", "Case ID"),
    ("is_issued", "Is Issued"),
    ("request_id", "Request ID"),
    ("ip_address", "IP Address"),
    ("error_message", "Error Message"),
]


class AadhaarVerificationLog(Document):
    pass


def _safe(value):
    """Plain text for Excel; stops values starting with = + - @ from running as formulas."""
    if value is None:
        return ""
    value = str(value)
    if value[:1] in ("=", "+", "-", "@"):
        value = "'" + value
    return value


@frappe.whitelist()
def download_report(filters=None):
    frappe.only_for("System Manager")  # Administrator always passes

    if isinstance(filters, str):
        filters = json.loads(filters or "[]")

    rows = frappe.get_all(
        "Aadhaar Verification Log",
        filters=filters or [],
        fields=[c[0] for c in COLUMNS],
        order_by="creation desc",
        limit_page_length=0,
    )

    data = [[c[1] for c in COLUMNS]]
    for r in rows:
        data.append([_safe(r.get(c[0])) for c in COLUMNS])

    filename = "Aadhaar_Verification_Log_" + frappe.utils.now_datetime().strftime("%Y%m%d_%H%M%S")
    build_xlsx_response(data, filename)
