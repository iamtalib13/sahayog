# sahayog/sahayog/doctype/aadhaar_verification/aadhaar_verification.py
#
# site_config.json:
#   "karza_api_key": "<<YOUR KEY>>"
# Testing without key:
#   "aadhaar_mock_mode": 1  and  "developer_mode": 1

import json
import re
import secrets
import time

import frappe
import requests
from frappe import _
from frappe.utils import now, now_datetime

ERROR_CODES = {
	# HTTP / gateway codes
	"200": "OK - Request successful",
	"400": "Bad Request - Mandatory fields are missing or invalid",
	"401": "Unauthorized Access - API key is missing or invalid",
	"402": "Insufficient Credits - Credits to access the APIs have expired",
	"500": "Internal Server Error - Internal processing error at Karza/Perfios",
	"503": "Source Unavailable - Source is down for maintenance or inaccessible",
	"504": "Endpoint Request Timed Out - Source response took more than 30 seconds",
	# Authentication API codes
	"101": "Valid Authentication",
	"102": "Invalid ID number or combination of inputs",
	"103": "No records found for the given ID or combination of inputs",
	"104": "Max retries exceeded",
	"105": "Missing Consent",
	"106": "Multiple Records Exist",
	"107": "Not Supported",
	"108": "Internal Resource Unavailable",
	"109": "Too many records found",
}


USER_MESSAGES = {
	"102": "The Aadhaar number seems to be incorrect. Please check the number and try again.",
	"103": "No Aadhaar record was found for this number. Please confirm the number with the Aadhaar holder.",
	"104": "Too many attempts were made. Please wait for some time and try again.",
	"105": "Consent could not be recorded. Please tick the consent box and try again.",
	"106": "More than one record was found for this Aadhaar. Please contact your administrator.",
	"107": "Verification is not available for this Aadhaar number. Please contact your administrator.",
	"108": "The Aadhaar service is temporarily unavailable. Please try again after some time.",
	"109": "Too many records were found for this Aadhaar. Please contact your administrator.",
	"400": "Some of the details entered are missing or incorrect. Please check and try again.",
	"401": "The verification service is not set up correctly. Please inform your administrator.",
	"402": "The verification service is not available right now. Please inform your administrator.",
	"500": "The Aadhaar service had a problem. Please try again after some time.",
	"503": "The Aadhaar service is under maintenance. Please try again after some time.",
	"504": "The Aadhaar service took too long to respond. Please try again.",
}
DEFAULT_USER_MESSAGE = (
	"Verification could not be completed. Please try again. "
	"If the problem continues, please contact your administrator."
)


CONSENT_TEXT = (
	"I confirm that the Aadhaar holder has given explicit consent to verify "
	"their Aadhaar number for KYC purposes."
)


ALLOWED_DESIGNATIONS = [
	"BRANCH OPERATION MANAGER",
	"REGIONAL OPERATION MANAGER",
	"CLUSTER OPERATION MANAGER",
	"ZONAL MANAGER",
]


def has_aadhaar_access(user=None):
	user = user or frappe.session.user
	if user == "Administrator" or "System Manager" in frappe.get_roles(user):
		return True
	designation = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "designation")
	return (designation or "").strip().upper() in ALLOWED_DESIGNATIONS


def check_access():
	if not has_aadhaar_access():
		frappe.throw(_("You are not permitted to use Aadhaar Verification."), frappe.PermissionError)


@frappe.whitelist()
def can_access():
	return 1 if has_aadhaar_access() else 0


@frappe.whitelist()
def verify(user_name, aadhaar_number, consent, case_id=None):
	"""Runs the verification and writes an audit log for every attempt."""
	frappe.flags.aadhaar_case_id = None
	frappe.flags.aadhaar_tech_error = None
	user_name = (user_name or "").strip()
	try:
		out = _verify(user_name, aadhaar_number, consent)
	except Exception as e:
		frappe.db.rollback()  # throw() ke baad bhi log bachane ke liye
		msg = str(e) or e.__class__.__name__
		tech = frappe.flags.get("aadhaar_tech_error")
		_write_log(user_name, aadhaar_number, error=("Technical: {0} || Shown to user: {1}".format(tech, msg) if tech else msg))
		raise
	_write_log(user_name, aadhaar_number, out=out)
	return out


def _write_log(user_name, aadhaar_number, out=None, error=None):
	"""Log failure should never break the verification itself."""
	try:
		out = out or {}
		digits = re.sub(r"\D", "", str(aadhaar_number or ""))
		masked = ("X" * 8 + digits[-4:]) if len(digits) >= 4 else ""
		frappe.get_doc(
			{
				"doctype": "Aadhaar Verification Log",
				"user_id": frappe.session.user,
				"user_full_name": frappe.utils.get_fullname(frappe.session.user),
				"log_datetime": now(),
				"ip_address": getattr(frappe.local, "request_ip", None),
				"holder_name": user_name,
				"aadhaar_masked": masked,
				"case_id": out.get("case_id") or frappe.flags.get("aadhaar_case_id"),
				"status": "Failed" if error else out.get("status"),
				"is_issued": out.get("is_issued"),
				"request_id": out.get("request_id"),
				"error_message": (error or "")[:1000],
			}
		).insert(ignore_permissions=True)
		frappe.db.commit()
	except Exception:
		frappe.log_error(title="Aadhaar log write failed")


def _verify(user_name, aadhaar_number, consent):
	"""Nothing is saved in DB. Returns the verification details directly."""
	check_access()

	user_name = (user_name or "").strip()
	case_id = _new_case_id()  # auto-generated, any input is ignored
	frappe.flags.aadhaar_case_id = case_id
	aadhaar_number = (aadhaar_number or "").strip()

	# server-side validation
	if not 3 <= len(user_name) <= 200:
		frappe.throw(_("User Name must be between 3 and 200 characters."))
	if not re.fullmatch(r"[2-9]\d{11}", aadhaar_number):
		frappe.throw(_("Aadhaar Number must be exactly 12 digits and cannot start with 0 or 1."))
	if not int(consent or 0):
		frappe.throw(_("Consent of the Aadhaar holder is mandatory."))

	out = {
		"user_id": frappe.session.user,
		"case_id": case_id,
		"verification_datetime": now(),
	}

	# TEST ONLY: no real API call
	if frappe.conf.get("aadhaar_mock_mode") and frappe.conf.get("developer_mode"):
		out.update(
			status="Verified (MOCK)",
			is_issued="Y",
			mobile="xxxxxxx584",
			gender="MALE",
			state="Maharashtra",
			age_band="20-30",
			request_id="MOCK-" + frappe.generate_hash(length=8),
		)
		return out

	key = frappe.conf.get("karza_api_key")
	if not key:
		frappe.throw(_("karza_api_key is not set in site_config.json"))
	headers = {"Content-Type": "application/json", "x-karza-key": key}
	client_data = {"caseId": case_id}

	# Step 1: consent -> accessKey (valid 30 min)
	consent_res = _post(
		"/v3/aadhaar-consent",
		{
			"consent": "Y",
			"ipAddress": frappe.local.request_ip,
			"userAgent": (frappe.get_request_header("User-Agent") or "Frappe")[:256],
			"name": user_name,
			"consentTime": str(int(time.time())),
			"consentText": CONSENT_TEXT,
			"clientData": client_data,
		},
		headers,
		30,
	)
	access_key = (consent_res.get("result") or {}).get("accessKey")
	if str(consent_res.get("statusCode")) != "101" or not access_key:
		_fail(consent_res)

	# Step 2: Aadhaar verification
	res = _post(
		"/v2/aadhaar-verification",
		{
			"consent": "Y",
			"aadhaarNo": aadhaar_number,
			"checkValidation": True,
			"accessKey": access_key,
			"clientData": client_data,
		},
		headers,
		180,
	)
	if str(res.get("status-code")) != "101":  # this API uses "status-code"
		_fail(res)

	result = res.get("result") or {}
	out.update(
		status="Verified" if result.get("isIssued") == "Y" else "Not Issued",
		is_issued=result.get("isIssued"),
		mobile=result.get("mobile"),
		gender=result.get("gender"),
		state=result.get("state"),
		age_band=result.get("ageBand"),
		request_id=res.get("request_id"),
	)
	return out


def _new_case_id():
	"""Numeric unique ID: YYYYMMDDHHMMSS + 3 random digits."""
	return now_datetime().strftime("%Y%m%d%H%M%S") + str(secrets.randbelow(900) + 100)


def _post(path, payload, headers, timeout):
	base_url = frappe.conf.get("karza_base_url") or "https://api.karza.in"
	try:
		return requests.post(base_url + path, json=payload, headers=headers, timeout=timeout).json()
	except (requests.RequestException, ValueError):
		frappe.log_error(title="Aadhaar API error")
		frappe.throw(_("Aadhaar service is unreachable. Please try again."))


def _fail(res):
	frappe.log_error(title="Aadhaar API failure", message=json.dumps(res)[:2000])
	code = str(res.get("status-code") or res.get("statusCode") or "")
	desc = ERROR_CODES.get(code)
	raw = (res.get("result") or {}).get("message") or res.get("error")
	raw = str(raw) if raw else None
	detail = " | ".join(p for p in (desc, raw if raw != desc else None) if p) or "Unknown error"
	# technical detail goes to the audit log only
	frappe.flags.aadhaar_tech_error = "({0}) {1}".format(code or "NA", detail)
	msg = USER_MESSAGES.get(code, DEFAULT_USER_MESSAGE)
	case_id = frappe.flags.get("aadhaar_case_id")
	if case_id:
		msg += " (Reference: Case ID {0})".format(case_id)
	frappe.throw(_(msg))
