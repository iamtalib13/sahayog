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
DEFAULT_USER_MESSAGE = "Verification could not be completed. Please try again."


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
	roles = frappe.get_roles(user)
	if user == "Administrator" or "System Manager" in roles:
		return True
	if "Aadhar Verification User" in roles:
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
	if not 2 <= len(user_name) <= 200:
		frappe.throw(_("Full Name must be between 2 and 200 characters."))
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

	key = _karza_setting("karza_api_key")
	if not key:
		frappe.throw(_("Karza API Key is not set in Sahayog Settings"))
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


def _karza_setting(fieldname):
	"""Sahayog Settings first, site_config.json as fallback."""
	val = None
	try:
		if fieldname == "karza_api_key":
			val = frappe.get_single("Sahayog Settings").get_password(fieldname, raise_exception=False)
		else:
			val = frappe.db.get_single_value("Sahayog Settings", fieldname)
	except Exception:
		val = None
	return val or frappe.conf.get(fieldname)


def _post(path, payload, headers, timeout):
	base_url = _karza_setting("karza_base_url") or "https://api.karza.in"
	try:
		return requests.post(base_url + path, json=payload, headers=headers, timeout=timeout).json()
	except (requests.RequestException, ValueError):
		frappe.log_error(title="Aadhaar API error")
		frappe.throw(_(DEFAULT_USER_MESSAGE))


def _fail(res):
    frappe.log_error(title="Aadhaar API failure", message=json.dumps(res)[:2000])
    code = str(res.get("status-code") or res.get("statusCode") or "")
    desc = ERROR_CODES.get(code)
    raw = (res.get("result") or {}).get("message") or res.get("error")
    raw = str(raw) if raw else None
    detail = " | ".join(p for p in (desc, raw if raw != desc else None) if p) or "Unknown error"
    # technical detail sirf audit log me jata hai
    frappe.flags.aadhaar_tech_error = "({0}) {1}".format(code or "NA", detail)
    frappe.throw(_(DEFAULT_USER_MESSAGE))

@frappe.whitelist()
def get_karza_api_key():
	"""Used by the eye icon in Sahayog Settings. System Manager only."""
	if "System Manager" not in frappe.get_roles():
		frappe.throw(_("Not permitted"), frappe.PermissionError)
	return frappe.get_single("Sahayog Settings").get_password("karza_api_key", raise_exception=False) or ""


# ======================================================================
# APPENDED: Bank Account Verification (same page)
# ======================================================================
import hashlib
import hmac

from frappe.utils import add_days, cint

IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
ACC_RE = re.compile(r"^[A-Za-z0-9]{5,25}$")

KC_CODES = {
    "KC01": "Transaction Successful",
    "KC02": "Credit Transaction Failed",
    "KC03": "Invalid Beneficiary Account Number or IFSC",
    "KC04": "Amount Limit Exceeded",
    "KC05": "Account Blocked/Frozen",
    "KC06": "NRE Account",
    "KC07": "Account Closed",
    "KC08": "Limit Exceeded For Member Bank",
    "KC09": "Transaction Not Allowed",
    "KC10": "Function Not Valid",
    "KC11": "Aadhaar Belong To Remitter Bank",
    "KC12": "Transaction Not Allowed",
    "KC13": "Customer Transaction Limit Exceeded",
    "KC14": "Payee Is An Individual And Not A Merchant",
    "KC15": "Payee Is A Merchant And Not An Individual",
    "KC16": "Foreign Inward Remittance Not Allowed",
    "KC17": "Transaction Not Allowed As Invalid Payment Reference",
    "KC18": "Invalid Amount",
    "KC19": "Invalid Remitter Account Number",
    "KC20": "General Error",
    "KC21": "Invalid Transaction Type",
    "KC22": "Invalid Amount Field",
    "KC23": "IMPS Service not available for the selected bank",
    "KC24": "Duplicate Transaction",
    "KC25": "Beneficiary Bank Not Enable For P2a",
    "KC26": "Insufficient Balance In Pool A/C",
    "KC27": "Invalid Account",
    "KC30": "Invalid Response Code",
    "KC31": "Exceeds Account Limit",
    "KC32": "Unable To Process",
    "KC33": "Invalid Message",
    "KC34": "Suspected Fraud",
    "KC35": "Transfer Amount Exceeds Limit",
    "KC36": "Key Sync Error",
    "KC37": "Timed Out",
    "KC38": "CBS Offline",
    "KC39": "Unmapped Error",
    "KC40": "Invalid Beneficiary IFSC Code or NBIN",
    "KC41": "Transaction Not Allowed",
    "KC42": "Foreign Inward Remittance For P2P Only",
    "KC43": "Invalid Channel",
    "KC44": "Authentication Failure",
    "KC45": "Invalid Account Type",
    "KC46": "Invalid Merchant Account",
    "KC47": "Invalid Remitter Name",
    "KC48": "Successful Transaction With Generic Name Returned In Account Name",
    "KC49": "Transaction Successful, Recipient Name Not Provided By Bank",
    "KC51": "Invalid Virtual Address",
    "KC52": "Duplicate Reference Number",
    "KC56": "Responsecode Not Maintained",
}

ACC_USER_MESSAGES = {
    "102": "The account number or IFSC seems to be incorrect. Please check and try again.",
    "103": "No record was found for this account. Please confirm the details with the account holder.",
    "104": "Too many attempts were made for this account number. Please try again after some time.",
    "105": "Consent could not be recorded. Please try again.",
    "107": "Verification is not available for this bank account. Please contact your administrator.",
    "108": "The bank service is temporarily unavailable. Please try again after some time.",
    "400": "Some of the details entered are missing or incorrect. Please check and try again.",
    "401": "The verification service is not set up correctly. Please inform your administrator.",
    "402": "The verification service is not available right now. Please inform your administrator.",
    "500": "The verification service had a problem. Please try again after some time.",
    "503": "The verification service is under maintenance. Please try again after some time.",
    "504": "The verification service took too long to respond. Please try again.",
}


def _acc_hash(ifsc, account_number):
    """One-way key for 'same account again' lookup. Full account number is never stored."""
    secret = frappe.conf.get("encryption_key") or frappe.local.site
    msg = "{0}|{1}".format((ifsc or "").upper(), (account_number or "").upper())
    return hmac.new(str(secret).encode(), msg.encode(), hashlib.sha256).hexdigest()


def _acc_cached(lookup_hash):
    """Latest successful REAL verification of the same IFSC + account, else None.
    Only 'Verified' results are reused, so temporary bank errors are never frozen.
    Optional expiry: set account_verification_cache_days in site_config.json."""
    filters = {"lookup_hash": lookup_hash, "status": "Verified", "from_cache": 0}
    days = cint(frappe.conf.get("account_verification_cache_days"))
    if days:
        filters["log_datetime"] = [">=", add_days(now_datetime(), -days)]
    rows = frappe.get_all(
        "Account Verification Log",
        filters=filters,
        fields=[
            "log_datetime", "status", "is_valid", "status_as_per_source", "account_name",
            "bank_response", "bank_status_code", "bank_rrn", "request_id",
        ],
        order_by="creation desc",
        limit_page_length=1,
    )
    return rows[0] if rows else None


@frappe.whitelist()
def verify_account(account_number, ifsc, consent):
    """Runs bank account verification and writes an audit log for every attempt."""
    frappe.flags.acc_case_id = None
    frappe.flags.acc_tech_error = None
    account_number = (account_number or "").strip()
    ifsc = (ifsc or "").strip().upper()
    lookup_hash = _acc_hash(ifsc, account_number)
    try:
        out = _verify_account(account_number, ifsc, consent, lookup_hash)
    except Exception as e:
        frappe.db.rollback()
        msg = str(e) or e.__class__.__name__
        tech = frappe.flags.get("acc_tech_error")
        _acc_write_log(
            account_number, ifsc, lookup_hash,
            error=("Technical: {0} || Shown to user: {1}".format(tech, msg) if tech else msg),
        )
        raise
    _acc_write_log(account_number, ifsc, lookup_hash, out=out)
    return out


def _acc_write_log(account_number, ifsc, lookup_hash, out=None, error=None):
    """Log failure should never break the verification itself."""
    try:
        out = out or {}
        acc = re.sub(r"[^A-Za-z0-9]", "", str(account_number or ""))
        masked = ("X" * max(len(acc) - 4, 0) + acc[-4:]) if len(acc) >= 4 else ""
        frappe.get_doc(
            {
                "doctype": "Account Verification Log",
                "user_id": frappe.session.user,
                "user_full_name": frappe.utils.get_fullname(frappe.session.user),
                "log_datetime": now(),
                "ip_address": getattr(frappe.local, "request_ip", None),
                "ifsc": ifsc,
                "account_masked": masked,
                "lookup_hash": lookup_hash,
                "case_id": out.get("case_id") or frappe.flags.get("acc_case_id"),
                "status": "Failed" if error else out.get("status"),
                "is_valid": out.get("is_valid"),
                "status_as_per_source": out.get("status_as_per_source"),
                "account_name": out.get("account_name"),
                "bank_response": out.get("bank_response"),
                "bank_status_code": out.get("bank_status_code"),
                "bank_rrn": out.get("bank_rrn"),
                "from_cache": 1 if out.get("from_cache") else 0,
                "request_id": out.get("request_id"),
                "error_message": (error or "")[:1000],
            }
        ).insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        frappe.log_error(title="Account verification log write failed")


def _verify_account(account_number, ifsc, consent, lookup_hash):
    """Full account number is never stored. Returns the verification details directly."""
    check_access()

    case_id = _new_case_id()
    frappe.flags.acc_case_id = case_id

    if not IFSC_RE.fullmatch(ifsc):
        frappe.throw(_("IFSC Code is invalid. Format: 4 letters, then 0, then 6 letters or digits."))
    if not ACC_RE.fullmatch(account_number):
        frappe.throw(_("Account Number must be 5 to 25 letters or digits."))
    if not int(consent or 0):
        frappe.throw(_("Consent of the account holder is mandatory."))

    out = {
        "user_id": frappe.session.user,
        "case_id": case_id,
        "verification_datetime": now(),
    }

    # TEST ONLY: no real API call
    if frappe.conf.get("aadhaar_mock_mode") and frappe.conf.get("developer_mode"):
        out.update(
            status="Verified (MOCK)",
            is_valid="Y",
            status_as_per_source="VALID",
            account_name="MOCK ACCOUNT HOLDER",
            bank_response="SUCCESSFUL TRANSACTION",
            bank_status_code="KC01",
            bank_status_desc=KC_CODES["KC01"],
            bank_rrn="MOCK" + frappe.generate_hash(length=8),
            request_id="MOCK-" + frappe.generate_hash(length=8),
        )
        return out

    # Same account verified earlier -> reuse, NO API call
    cached = _acc_cached(lookup_hash)
    if cached:
        out.update(
            status=cached.status,
            is_valid=cached.is_valid,
            status_as_per_source=cached.status_as_per_source,
            account_name=cached.account_name,
            bank_response=cached.bank_response,
            bank_status_code=cached.bank_status_code,
            bank_status_desc=KC_CODES.get(cached.bank_status_code or ""),
            bank_rrn=cached.bank_rrn,
            request_id=cached.request_id,
            from_cache=1,
            verified_on=str(cached.log_datetime)[:19],
        )
        return out

    key = _karza_setting("karza_api_key")
    if not key:
        frappe.throw(_("Karza API Key is not set in Sahayog Settings"))
    headers = {"Content-Type": "application/json", "x-karza-key": key}

    payload = {
        "consent": "Y",
        "accountNumber": account_number,
        "ifsc": ifsc,
        "clientData": {"caseId": case_id},
    }

    res = _post("/v3/bankacc-verification-non-penny", payload, headers, 70)
    if str(res.get("statusCode") or res.get("status-code")) != "101":
        _acc_fail(res)

    result = res.get("result") or {}
    sources = (result.get("data") or {}).get("source") or [{}]
    src = sources[0] or {}
    sd = src.get("data") or {}
    valid = bool(src.get("isValid"))
    kc = sd.get("statusCode")

    out.update(
        status="Verified" if valid else "Not Valid",
        is_valid="Y" if valid else "N",
        status_as_per_source=src.get("statusAsPerSource"),
        account_name=sd.get("accountName"),
        bank_response=sd.get("bankResponse"),
        bank_status_code=kc,
        bank_status_desc=KC_CODES.get(kc or ""),
        bank_rrn=sd.get("bankRRN"),
        request_id=res.get("requestId") or res.get("request_id"),
    )
    return out


def _acc_fail(res):
    frappe.log_error(title="Account verification API failure", message=json.dumps(res)[:2000])
    code = str(res.get("statusCode") or res.get("status-code") or "")
    desc = ERROR_CODES.get(code)
    raw = (res.get("result") or {}).get("message") or res.get("error")
    raw = str(raw) if raw else None
    detail = " | ".join(p for p in (desc, raw if raw != desc else None) if p) or "Unknown error"
    frappe.flags.acc_tech_error = "({0}) {1}".format(code or "NA", detail)
    frappe.throw(_(ACC_USER_MESSAGES.get(code, DEFAULT_USER_MESSAGE)))
