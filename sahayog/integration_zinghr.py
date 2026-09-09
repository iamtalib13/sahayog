import base64
from datetime import timedelta
import frappe
from frappe import _
from frappe.utils import getdate, now_datetime, today, cint, add_days
import requests
from typing import Dict, Any, Optional, List, Tuple, Set

logger = frappe.logger("zinghr_integration")
TOKEN_CACHE_KEY = "zinghr_api_jwt_token"


class ZingHRConfig:
    """Dynamically loads and validates API settings from 'Sahayog HR Setting'."""

    @classmethod
    def get(cls) -> Dict[str, str]:
        try:
            settings = frappe.get_cached_doc("Sahayog HR Setting")
        except Exception:
            settings = frappe.get_single("Sahayog HR Setting")

        auth_url = (settings.get("zinghr_auth_url") or "").strip()
        emp_url = (settings.get("zinghr_employee_url") or "").strip()

        if not auth_url or not emp_url:
            frappe.throw(_("ZingHR API URLs are not configured in 'Sahayog HR Setting'."))

        # Resolve Basic Auth token
        basic_token = ""
        try:
            basic_token = (settings.get_password("zinghr_basic_token") or "").strip()
        except Exception:
            basic_token = (settings.get("zinghr_basic_token") or "").strip()

        username = (settings.get("zinghr_username") or "").strip()
        password = ""
        try:
            password = (settings.get_password("zinghr_password") or "").strip()
        except Exception:
            password = (settings.get("zinghr_password") or "").strip()

        if basic_token and not basic_token.startswith("*"):
            auth_header = f"Basic {basic_token.replace('Basic ', '').strip()}"
        elif username and password:
            encoded = base64.b64encode(f"{username}:{password}".encode()).decode()
            auth_header = f"Basic {encoded}"
        else:
            frappe.throw(_("ZingHR credentials are not configured in 'Sahayog HR Setting'."))

        return {
            "auth_url": auth_url,
            "emp_url": emp_url,
            "basic_auth": auth_header
        }


class ZingHRClient:
    """Client for ZingHR Auth and Employee API."""

    def __init__(self):
        config = ZingHRConfig.get()
        self.auth_url = config["auth_url"]
        self.emp_url = config["emp_url"]
        self.basic_auth = config["basic_auth"]

    def get_jwt_token(self, force_refresh: bool = False) -> str:
        cache = frappe.cache()
        if not force_refresh:
            cached = cache.get_value(TOKEN_CACHE_KEY)
            if cached:
                return cached

        try:
            res = requests.get(self.auth_url, headers={"Authorization": self.basic_auth, "Accept": "application/json"}, timeout=20)
            res.raise_for_status()
            token = res.json().get("data")
            if not token:
                raise ValueError("Token missing in response")
            cache.set_value(TOKEN_CACHE_KEY, token, expires_in_sec=900)
            return token
        except Exception as e:
            logger.error(f"ZingHR Auth Failed: {str(e)}")
            frappe.throw(_("Failed to authenticate with ZingHR API: {0}").format(str(e)))

    def _request(self, payload: Dict[str, Any], timeout: int = 45) -> Dict[str, Any]:
        token = self.get_jwt_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json", "Accept": "application/json"}

        res = requests.post(self.emp_url, headers=headers, json=payload, timeout=timeout)
        if res.status_code == 401:
            token = self.get_jwt_token(force_refresh=True)
            headers["Authorization"] = f"Bearer {token}"
            res = requests.post(self.emp_url, headers=headers, json=payload, timeout=timeout)

        res.raise_for_status()
        return res.json().get("data", {})

    def fetch_single(self, employee_code: str) -> Optional[Dict[str, Any]]:
        data = self._request({"employeeCode": str(employee_code).strip()})
        employees = data.get("employees", []) if isinstance(data, dict) else data
        return employees[0] if employees else None

    def fetch_batch(self, page_size: int, page_number: int, from_date: Optional[str] = None, to_date: Optional[str] = None) -> Tuple[List[Dict[str, Any]], int]:
        def _fmt_date(d):
            if not d:
                return None
            try:
                return getdate(d).strftime("%d-%m-%Y")
            except Exception:
                return str(d).strip()

        payload = {"pageSize": page_size, "pageNumber": page_number}
        if from_date:
            f_date = _fmt_date(from_date)
            payload["FromDate"] = f_date
            payload["Fromdate"] = f_date
        if to_date:
            t_date = _fmt_date(to_date)
            payload["ToDate"] = t_date
            payload["Todate"] = t_date

        data = self._request(payload, timeout=60)
        if isinstance(data, dict):
            return data.get("employees", []), int(data.get("totalEmployeeCount") or len(data.get("employees", [])))
        return data, len(data)


class MasterResolver:
    """In-memory case-insensitive cache for fast master lookup without repeated DB queries."""

    def __init__(self, company: Optional[str] = None):
        self.company = (
            company
            or frappe.db.get_single_value("Global Defaults", "default_company")
            or "Sahayog"
        )
        self.zones: Dict[str, str] = {z.lower(): z for z in frappe.get_all("Zone", pluck="name")}
        self.regions: Dict[str, str] = {r.lower(): r for r in frappe.get_all("Region", pluck="name")}
        self.designations: Dict[str, str] = {d.lower(): d for d in frappe.get_all("Designation", pluck="name")}
        self.departments: Dict[str, str] = {
            d.department_name.lower(): d.name
            for d in frappe.get_all("Department", fields=["name", "department_name"])
            if d.department_name
        }
        # Map Sahayog Branch by name (SOL ID), sol_id, branch_code, and branch label
        self.sahayog_branches: Dict[str, str] = {}
        self.sahayog_branches_by_label: Dict[str, str] = {}
        for b in frappe.get_all("Sahayog Branch", fields=["name", "sol_id", "branch_code", "branch"]):
            bname = str(b.name).strip()
            self.sahayog_branches[bname.lower()] = bname
            if b.sol_id:
                self.sahayog_branches[str(b.sol_id).strip().lower()] = bname
            if b.branch_code:
                self.sahayog_branches[str(b.branch_code).strip().lower()] = bname
            if b.branch:
                self.sahayog_branches_by_label[b.branch.strip().lower()] = bname

        self.branches: Dict[str, str] = {b.lower(): b for b in frappe.get_all("Branch", pluck="name")}
        self.branch_sol_ids: Dict[str, str] = {
            b.name.lower(): str(b.sol_id).strip()
            for b in frappe.get_all("Branch", fields=["name", "sol_id"])
            if b.sol_id
        }
        self.divisions: Dict[str, str] = {d.lower(): d for d in frappe.get_all("Division", pluck="name")}

    def resolve_zone(self, val: Optional[str]) -> Optional[str]:
        if not val:
            return None
        raw = val.strip().upper().replace(" ", "")
        if not raw.startswith("ZONE-"):
            raw = f"ZONE-{raw}"
        key = raw.lower()
        if key in self.zones:
            return self.zones[key]
        doc = frappe.get_doc({"doctype": "Zone", "zone": raw}).insert(ignore_permissions=True)
        self.zones[key] = doc.name
        return doc.name

    def resolve_region(self, val: Optional[str]) -> Optional[str]:
        if not val:
            return None
        raw = val.strip()
        clean = raw.replace(" ", "").upper().replace("-", "").replace("_", "")
        if clean in ["HEADOFFICE", "HO"]:
            if "head office" not in self.regions:
                doc = frappe.get_doc({"doctype": "Region", "region": "HEAD OFFICE"}).insert(ignore_permissions=True)
                self.regions["head office"] = doc.name
            return self.regions.get("head office", "HEAD OFFICE")

        key = raw.lower()
        if key in self.regions:
            return self.regions[key]

        reg = raw.upper().replace(" ", "")
        if not reg.startswith("REGION-"):
            reg = f"REGION-{reg}"
        reg_key = reg.lower()
        if reg_key in self.regions:
            return self.regions[reg_key]

        doc = frappe.get_doc({"doctype": "Region", "region": reg}).insert(ignore_permissions=True)
        self.regions[reg_key] = doc.name
        return doc.name

    def resolve_designation(self, val: Optional[str]) -> Optional[str]:
        if not val:
            return None
        clean = val.strip()
        key = clean.lower()
        if key in self.designations:
            return self.designations[key]
        doc = frappe.get_doc({"doctype": "Designation", "designation_name": clean}).insert(ignore_permissions=True)
        self.designations[key] = doc.name
        return doc.name

    def resolve_department(self, val: Optional[str]) -> Optional[str]:
        if not val:
            return None
        clean = val.strip()
        key = clean.lower()
        if key in self.departments:
            return self.departments[key]
        doc = frappe.get_doc({"doctype": "Department", "department_name": clean, "company": self.company}).insert(ignore_permissions=True)
        self.departments[key] = doc.name
        return doc.name

    def resolve_sahayog_branch(
        self,
        branch_code: Optional[str],
        branch_name: Optional[str],
        resolved_branch: Optional[str] = None,
    ) -> Optional[str]:
        # BranchCode must strictly be an integer; if it is a String (non-digit), fall back to Branch
        if branch_code is not None:
            raw_code = str(branch_code).strip()
            if raw_code.isdigit():
                code = raw_code.lower()
                if code in self.sahayog_branches:
                    return self.sahayog_branches[code]
                lcode = code.lstrip("0")
                if lcode and lcode in self.sahayog_branches:
                    return self.sahayog_branches[lcode]

        if branch_name:
            b_name = str(branch_name).strip().lower()
            if b_name in self.sahayog_branches_by_label:
                return self.sahayog_branches_by_label[b_name]
            clean_b = b_name.replace(" branch", "").replace(" ho", "").replace(" ro", "").strip()
            if clean_b in self.sahayog_branches_by_label:
                return self.sahayog_branches_by_label[clean_b]

        # Fallback: If sahayog_branch not matched, lookup sol_id from Branch master
        target_branch = resolved_branch or branch_name
        if target_branch:
            tb_key = str(target_branch).strip().lower()
            sol = self.branch_sol_ids.get(tb_key)
            if not sol:
                clean_tb = tb_key.replace(" branch", "").replace(" ho", "").replace(" ro", "").strip()
                sol = self.branch_sol_ids.get(clean_tb)
            if sol:
                sol_str = str(sol).strip()
                sol_key = sol_str.lower()
                if sol_key in self.sahayog_branches:
                    return self.sahayog_branches[sol_key]
                if sol_str.isdigit():
                    return sol_str

        return None

    def resolve_branch(self, val: Optional[str]) -> Optional[str]:
        if not val:
            return None
        clean = val.strip()
        key = clean.lower()
        if key in self.branches:
            return self.branches[key]
        doc = frappe.get_doc({"doctype": "Branch", "branch": clean}).insert(ignore_permissions=True)
        self.branches[key] = doc.name
        return doc.name

    def resolve_division(self, val: Optional[str]) -> Optional[str]:
        if not val:
            return None
        key = val.strip().lower()
        if key in self.divisions:
            return self.divisions[key]
        doc = frappe.get_doc({"doctype": "Division", "division": val.strip()}).insert(ignore_permissions=True)
        self.divisions[key] = doc.name
        return doc.name

    @staticmethod
    def resolve_gender(val: Optional[str]) -> str:
        if not val:
            return "Male"
        lower = str(val).strip().lower()
        if lower in ["f", "female", "woman"]:
            return "Female"
        if lower in ["o", "other"]:
            return "Other"
        return "Male"


def parse_employee_payload(emp_raw: Dict[str, Any], resolver: MasterResolver) -> Dict[str, Any]:
    """Parse raw ZingHR JSON to structured dictionary ready for DB upsert."""
    attrs = {}
    for a in emp_raw.get("attributes", []):
        code = a.get("attributeTypeCode") or ""
        desc = a.get("attributeTypeDescription") or ""
        val = (a.get("attributeTypeUnitDescription") or "").strip()
        if code:
            attrs[code] = val
        if desc:
            attrs[desc] = val

    def _date(val):
        try:
            return getdate(val) if val and str(val).strip() else None
        except Exception:
            return None

    raw_branch_code = attrs.get("BranchCode") or attrs.get("Branch Code")
    raw_branch_name = attrs.get("Branch")
    branch = resolver.resolve_branch(raw_branch_name)
    sahayog_branch = resolver.resolve_sahayog_branch(
        branch_code=raw_branch_code,
        branch_name=raw_branch_name,
        resolved_branch=branch,
    )

    def _is_integer_value(val: Any) -> bool:
        if val is None:
            return False
        s = str(val).strip()
        return bool(s and s.isdigit())

    # sahayog_branch set krte time check: integer value he chahiye.
    # String / non-integer rhi to fallback me chale jana chahiye with Branch fallback.
    if not _is_integer_value(sahayog_branch):
        sahayog_branch = None
        target_branch = branch or raw_branch_name
        if target_branch:
            tb_key = str(target_branch).strip().lower()
            sol = resolver.branch_sol_ids.get(tb_key)
            if not sol:
                clean_tb = tb_key.replace(" branch", "").replace(" ho", "").replace(" ro", "").strip()
                sol = resolver.branch_sol_ids.get(clean_tb)
            if sol and _is_integer_value(sol):
                sol_str = str(sol).strip()
                sahayog_branch = resolver.sahayog_branches.get(sol_str.lower(), sol_str)

    # Ensure sahayog_branch is strictly integer digits, else None
    if sahayog_branch and not _is_integer_value(sahayog_branch):
        sahayog_branch = None

    sol_id = sahayog_branch

    leaving_date = _date(emp_raw.get("dateOfLeaving") or emp_raw.get("exitDate"))
    today_date = getdate(today())
    is_past_leaving = bool(leaving_date and leaving_date <= today_date)
    is_left_status = emp_raw.get("employeeStatus") in ["Left", "Resigned", "FnF InProcess", "FnF Locked"]
    is_exited = bool(is_past_leaving or is_left_status)
    status = "Left" if is_exited else "Active"
    cost_code = (
        attrs.get("CostCode")
        or attrs.get("Cost Code")
        or emp_raw.get("costCode")
        or ""
    ).strip()

    return {
        "employee_number": str(emp_raw.get("employeeCode", "")).strip(),
        "first_name": (emp_raw.get("firstName") or "").strip(),
        "middle_name": (emp_raw.get("middleName") or "").strip(),
        "last_name": (emp_raw.get("lastName") or "").strip(),
        "employee_name": (emp_raw.get("employeeName") or f"{emp_raw.get('firstName', '')} {emp_raw.get('lastName', '')}").strip(),
        "company": resolver.company,
        "cost_code": cost_code,
        "company_email": (emp_raw.get("email") or "").strip(),
        "cell_number": (emp_raw.get("mobileNo") or "").strip(),
        "gender": resolver.resolve_gender(emp_raw.get("gender")),
        "date_of_birth": _date(emp_raw.get("dateOfBirth")),
        "date_of_joining": _date(emp_raw.get("dateOfJoining")),
        "status": status,
        "relieving_date": leaving_date,
        "_is_past_leaving": is_past_leaving,
        "_is_exited": is_exited,
        "reporting_manager_code": str(emp_raw.get("reportingManagerCode") or "").strip(),
        "designation": resolver.resolve_designation(attrs.get("Designation")),
        "department": resolver.resolve_department(attrs.get("Department")),
        "sub_department": (attrs.get("SubDepartment") or attrs.get("Sub Department") or "").strip(),
        "custom_zone": resolver.resolve_zone(attrs.get("Zone")),
        "custom_region": resolver.resolve_region(attrs.get("Region")),
        "custom_district": attrs.get("DistrictName") or attrs.get("District Name") or "",
        "custom_division": resolver.resolve_division(attrs.get("BusinessUnit") or attrs.get("SubDepartment") or "HEAD OFFICE"),
        "sahayog_branch": sahayog_branch,
        "sol_id": sol_id,
        "branch": branch,
    }


def fast_upsert_employees(
    raw_employees: List[Dict[str, Any]],
    sync_mode: str = "all",
    resolver: Optional[MasterResolver] = None
) -> Dict[str, Any]:
    """
    High-performance batch upsert using bulk pre-fetching and direct diff updates.
    """
    if not raw_employees:
        return {"inserted": 0, "updated": 0, "skipped": 0, "errors": []}

    # Ensure silent bulk processing without rate-limiting or leaked UI popups
    frappe.flags.in_import = True
    frappe.flags.mute_messages = True

    resolver = resolver or MasterResolver()
    parsed_records = [parse_employee_payload(e, resolver) for e in raw_employees if e.get("employeeCode")]
    emp_codes = [p["employee_number"] for p in parsed_records]

    # Bulk fetch existing employees in 1 query
    existing_records = {
        (e.employee_number or e.name): e
        for e in frappe.get_all(
            "Employee",
            filters={"employee_number": ["in", emp_codes]},
            fields=["name", "employee_number", "status", "exclude_zinghr"],
        )
    }

    # Bulk fetch reporting managers
    mgr_codes = list({p["reporting_manager_code"] for p in parsed_records if p["reporting_manager_code"]})
    mgr_map = {}
    if mgr_codes:
        mgr_map = {
            (m.employee_number or m.name): m.name
            for m in frappe.get_all("Employee", filters={"employee_number": ["in", mgr_codes]}, fields=["name", "employee_number"])
        }

    now = now_datetime()
    inserted, updated, skipped, errors = 0, 0, 0, []

    for item in parsed_records:
        code = item["employee_number"]
        existing = existing_records.get(code) or (code if frappe.db.exists("Employee", code) else None)
        emp_name = existing.name if hasattr(existing, "name") else existing

        is_past_leaving = item.pop("_is_past_leaving", False)
        is_exited = item.pop("_is_exited", False)

        # Check sync mode constraints
        if emp_name and sync_mode == "insert_only":
            skipped += 1
            continue
        if not emp_name and sync_mode == "update_only":
            skipped += 1
            continue

        # Skip update if exclude_zinghr is checked
        if emp_name:
            is_excluded = getattr(existing, "exclude_zinghr", None)
            if is_excluded is None:
                is_excluded = frappe.db.get_value("Employee", emp_name, "exclude_zinghr")
            if is_excluded:
                skipped += 1
                continue

        item["reports_to"] = mgr_map.get(item.pop("reporting_manager_code", None))
        item["custom_zinghr_last_synced"] = now

        try:
            if emp_name:
                # Fast direct update: Status is Left if past/resigned, else Active
                frappe.db.set_value("Employee", emp_name, item, update_modified=False)
                if item.get("status") == "Left":
                    user_id = frappe.db.get_value("Employee", emp_name, "user_id")
                    if not user_id:
                        user_id = (
                            frappe.db.get_value("User", {"email": f"{code}@sahayog.com"}, "name")
                            or frappe.db.get_value("User", {"username": code}, "name")
                        )
                    if user_id and frappe.db.exists("User", user_id):
                        frappe.db.set_value("User", user_id, "enabled", 0, update_modified=False)
                updated += 1
            else:
                # New Employee creation:
                # Skip insertion if leaving date is in the past or already exited!
                if is_past_leaving or is_exited:
                    skipped += 1
                    continue

                doc = frappe.new_doc("Employee")
                doc.update(item)
                doc.name = code
                doc.company = resolver.company
                doc.flags.ignore_mandatory = True
                doc.flags.ignore_permissions = True
                doc.flags.ignore_links = True
                doc.flags.in_import = True
                doc.flags.mute_messages = True
                doc.insert(ignore_permissions=True)
                existing_records[code] = doc
                inserted += 1
        except Exception as ex:
            err_msg = f"Failed {code}: {str(ex)}"
            logger.error(err_msg)
            errors.append(err_msg)
            # Suppress any leaked throw messages from Desk modal
            if getattr(frappe.local, "message_log", None):
                frappe.local.message_log = [
                    m for m in frappe.local.message_log
                    if "Throttled" not in str(m) and "not found" not in str(m)
                ]

    return {"inserted": inserted, "updated": updated, "skipped": skipped, "errors": errors}


# ==============================================================================
# Whitelisted RPC Methods
# ==============================================================================

@frappe.whitelist()
def sync_employee_from_zinghr(employee_name: str) -> Dict[str, Any]:
    """Single employee fast update."""
    if frappe.session.user == "Guest":
        frappe.throw(_("Please log in to perform this action."), frappe.PermissionError)

    if frappe.db.get_value("Employee", employee_name, "exclude_zinghr"):
        return {
            "status": "skipped",
            "message": _("Employee {0} has 'Exclude ZingHR' enabled. Update skipped.").format(employee_name),
            "details": {"inserted": 0, "updated": 0, "skipped": 1, "errors": []},
        }

    frappe.flags.in_import = True
    frappe.flags.mute_messages = True

    emp_number = frappe.db.get_value("Employee", employee_name, "employee_number") or employee_name
    client = ZingHRClient()
    raw_emp = client.fetch_single(emp_number)

    if not raw_emp:
        return {"status": "not_found", "message": _("Employee {0} not found in ZingHR.").format(emp_number)}

    res = fast_upsert_employees([raw_emp], sync_mode="update_only")
    frappe.db.commit()

    if getattr(frappe.local, "message_log", None):
        frappe.local.message_log = []

    return {"status": "success", "message": _("Employee {0} updated from ZingHR!").format(employee_name), "details": res}


def _clean_param(val: Any) -> Optional[str]:
    if val is None or val == "":
        return None
    s = str(val).strip()
    if s.lower() in ["null", "none", "undefined", ""]:
        return None
    return s


def _clean_int(val: Any, default: Optional[int] = None) -> Optional[int]:
    clean = _clean_param(val)
    if clean is None:
        return default
    try:
        return int(clean)
    except (ValueError, TypeError):
        return default


@frappe.whitelist()
def sync_zinghr_batch(
    page_number: int = 1,
    page_size: int = 100,
    sync_mode: str = "all",
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
) -> Dict[str, Any]:
    """Sync a single page batch synchronously and return results."""
    if frappe.session.user == "Guest":
        frappe.throw(_("Please log in to perform this action."), frappe.PermissionError)

    frappe.flags.in_import = True
    frappe.flags.mute_messages = True

    page_number = _clean_int(page_number, default=1)
    page_size = _clean_int(page_size, default=100)
    from_date = _clean_param(from_date)
    to_date = _clean_param(to_date)
    sync_mode = _clean_param(sync_mode) or "all"

    client = ZingHRClient()
    resolver = MasterResolver()

    employees, total_records = client.fetch_batch(page_size, page_number, from_date, to_date)
    if not employees:
        return {
            "status": "completed",
            "page_number": page_number,
            "total_records": total_records,
            "fetched": 0,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "errors": []
        }

    res = fast_upsert_employees(employees, sync_mode=sync_mode, resolver=resolver)
    frappe.db.commit()

    # Clear server messages so no internal throws/warnings trigger UI popups
    if getattr(frappe.local, "message_log", None):
        frappe.local.message_log = []

    return {
        "status": "success",
        "page_number": page_number,
        "total_records": total_records,
        "fetched": len(employees),
        "inserted": res["inserted"],
        "updated": res["updated"],
        "skipped": res["skipped"],
        "errors": res["errors"]
    }


@frappe.whitelist()
def bulk_sync_from_zinghr(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    sync_mode: str = "all",
    page_size: int = 100,
    page_number: int = 1,
    max_pages: Optional[int] = None,
    run_in_background: bool = True
) -> Dict[str, Any]:
    """Bulk sync with background queue support."""
    if frappe.session.user == "Guest":
        frappe.throw(_("Please log in to perform this action."), frappe.PermissionError)

    page_size = _clean_int(page_size, default=100)
    page_number = _clean_int(page_number, default=1)
    max_pages = _clean_int(max_pages, default=None)
    from_date = _clean_param(from_date)
    to_date = _clean_param(to_date)
    sync_mode = _clean_param(sync_mode) or "all"
    is_bg = bool(run_in_background and str(run_in_background).lower() in ["true", "1"])

    if is_bg:
        try:
            job = frappe.enqueue(
                "sahayog.integration_zinghr.run_bulk_sync_job",
                queue="long",
                timeout=7200,
                from_date=from_date,
                to_date=to_date,
                sync_mode=sync_mode,
                page_size=page_size,
                page_number=page_number,
                max_pages=max_pages
            )
            frappe.db.commit()
            return {
                "status": "queued",
                "message": _("Bulk sync started in background (batches of {0}).").format(page_size),
                "job_id": getattr(job, "id", None)
            }
        except Exception as e:
            frappe.log_error(f"Failed to enqueue bulk sync: {str(e)}", "ZingHR Background Sync")
            return {
                "status": "error",
                "message": f"Failed to start background sync: {str(e)}"
            }

    return run_bulk_sync_job(from_date, to_date, sync_mode, page_size, page_number, max_pages)


def get_system_manager_users() -> list[str]:
    """Return enabled users with the System Manager role."""
    try:
        sm_parents = frappe.get_all(
            "Has Role",
            filters={"role": "System Manager", "parenttype": "User"},
            pluck="parent",
        )
        if not sm_parents:
            return []
        return frappe.get_all(
            "User",
            filters={"name": ["in", list(set(sm_parents))], "enabled": 1},
            pluck="name",
        )
    except Exception as e:
        logger.warning(f"Failed to fetch System Manager users: {e}")
        return []


def emit_zinghr_progress(
    percent: int,
    title: str,
    description: str,
    users: Optional[list[str]] = None,
) -> None:
    """Publish ZingHR sync progress exclusively to System Managers."""
    try:
        target_users = users if users is not None else get_system_manager_users()
        for u in target_users:
            frappe.publish_realtime(
                event="zinghr_sync_progress",
                message={
                    "percent": percent,
                    "title": title,
                    "description": description,
                },
                user=u,
                after_commit=False,
            )
    except Exception as e:
        logger.warning(f"Failed to publish ZingHR sync progress: {e}")


def run_bulk_sync_job(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    sync_mode: str = "all",
    page_size: int = 100,
    page_number: int = 1,
    max_pages: Optional[int] = None
) -> Dict[str, Any]:
    """Optimized bulk sync runner."""
    frappe.flags.in_import = True
    frappe.flags.mute_messages = True

    current_page = _clean_int(page_number, default=1)
    page_size = _clean_int(page_size, default=100)
    max_pages = _clean_int(max_pages, default=None)
    from_date = _clean_param(from_date)
    to_date = _clean_param(to_date)
    sync_mode = _clean_param(sync_mode) or "all"

    client = ZingHRClient()
    resolver = MasterResolver()
    sm_users = get_system_manager_users()
    pages_processed, total_fetched, total_inserted, total_updated, total_skipped = 0, 0, 0, 0, 0
    all_errors = []

    logger.info(f"Starting ZingHR fast sync in batches of {page_size}. Mode: {sync_mode}")

    while True:
        employees, total_records = client.fetch_batch(page_size, current_page, from_date, to_date)
        if not employees:
            break

        total_fetched += len(employees)
        pages_processed += 1

        res = fast_upsert_employees(employees, sync_mode=sync_mode, resolver=resolver)
        total_inserted += res["inserted"]
        total_updated += res["updated"]
        total_skipped += res["skipped"]
        all_errors.extend(res["errors"])

        frappe.db.commit()

        # Emit Desk Progress only to System Managers (custom event, scoped to Employee list)
        percent = min(int((total_fetched / total_records) * 100), 100) if total_records else 0
        emit_zinghr_progress(
            percent=percent,
            title=_("Syncing Employees from ZingHR"),
            description=_("Batch {0}: {1}/{2} records (Updated: {3}, Inserted: {4})").format(
                current_page, total_fetched, total_records, total_updated, total_inserted
            ),
            users=sm_users,
        )

        if (max_pages and pages_processed >= max_pages) or len(employees) < page_size or total_fetched >= total_records:
            break

        current_page += 1

    emit_zinghr_progress(
        percent=100,
        title=_("Syncing Employees from ZingHR"),
        description=_("Sync completed: {0} processed ({1} inserted, {2} updated)").format(
            total_fetched, total_inserted, total_updated
        ),
        users=sm_users,
    )

    summary = {
        "status": "success",
        "total_fetched": total_fetched,
        "total_inserted": total_inserted,
        "total_updated": total_updated,
        "total_skipped": total_skipped,
        "error_count": len(all_errors),
        "errors": all_errors[:10]
    }
    logger.info(f"ZingHR sync completed: {summary}")

    # Track last sync in Sahayog HR Setting
    try:
        date_info = f"({from_date} to {to_date})" if from_date or to_date else "(Full Sync)"
        frappe.db.set_value(
            "Sahayog HR Setting",
            None,
            {
                "zinghr_last_sync_datetime": now_datetime(),
                "zinghr_last_sync_status": (
                    f"Sync {date_info} at {now_datetime().strftime('%Y-%m-%d %H:%M:%S')}\n"
                    f"Status: {summary.get('status')} | Fetched: {summary.get('total_fetched')} | "
                    f"Inserted: {summary.get('total_inserted')} | Updated: {summary.get('total_updated')} | "
                    f"Errors: {summary.get('error_count')}"
                ),
            },
            update_modified=False,
        )
        frappe.db.commit()
    except Exception as e:
        logger.warning(f"Failed to update Sahayog HR Setting sync status: {e}")

    return summary


def auto_daily_delta_sync() -> Dict[str, Any]:
    """
    Scheduled Daily Delta Sync:
    Runs automatically (e.g. at 2:30 AM via Frappe scheduler).
    Fetches only changed/added records between (last_sync - buffer) and today.
    Takes 5-15 seconds instead of doing a full 13,400+ record sweep.
    """
    try:
        settings = frappe.get_single("Sahayog HR Setting")
    except Exception:
        settings = frappe.get_cached_doc("Sahayog HR Setting")

    if not cint(settings.get("zinghr_enable_auto_sync", 1)):
        logger.info("ZingHR Daily Auto Delta Sync is disabled in Sahayog HR Setting.")
        return {"status": "skipped", "message": "Auto sync disabled in Sahayog HR Setting"}

    lookback_days = cint(settings.get("zinghr_sync_lookback_days") or 1)
    last_sync = settings.get("zinghr_last_sync_datetime")

    today_date = getdate(today())

    if last_sync:
        from_date = (getdate(last_sync) - timedelta(days=lookback_days)).strftime("%Y-%m-%d")
    else:
        from_date = (today_date - timedelta(days=max(lookback_days, 1))).strftime("%Y-%m-%d")

    to_date = today_date.strftime("%Y-%m-%d")

    logger.info(f"Starting ZingHR Auto Daily Delta Sync: from {from_date} to {to_date} (lookback={lookback_days}d)")

    summary = run_bulk_sync_job(
        from_date=from_date,
        to_date=to_date,
        sync_mode="all",
        page_size=100,
        page_number=1,
        max_pages=None,
    )

    return summary
