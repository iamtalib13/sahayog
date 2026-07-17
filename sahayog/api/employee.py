import frappe
from frappe import _, cint
from frappe.utils import getdate, date_diff


@frappe.whitelist()
def get_next_support_staff_id():
    """Predict the next available 'P' series ID by checking existing employees."""
    # Find the maximum number used in P-series from employee_number field
    # We look for both 'P.00001' and 'P1' patterns
    query = """
        SELECT employee_number 
        FROM `tabEmployee` 
        WHERE employee_number LIKE 'P%' 
        ORDER BY LENGTH(employee_number) DESC, employee_number DESC 
        LIMIT 50
    """
    existing_p_numbers = frappe.db.sql(query, as_dict=True)
    
    max_num = 0
    for row in existing_p_numbers:
        emp_num = row.get("employee_number")
        if not emp_num: continue
        
        # Strip 'P.' or 'P' and try to get the number
        num_str = ""
        if emp_num.startswith("P."):
            num_str = emp_num[2:]
        elif emp_num.startswith("P"):
            num_str = emp_num[1:]
            
        try:
            val = cint(num_str)
            if val > max_num:
                max_num = val
        except:
            continue
            
    # Also check tabSeries for P. as a fallback/safety
    series_val = frappe.db.sql("SELECT current FROM `tabSeries` WHERE name='P.'")
    series_current = series_val[0][0] if series_val else 0
    
    if cint(series_current) > max_num:
        max_num = cint(series_current)

    next_id = max_num + 1
    return f"P{next_id}"


def _parse_date(val):
    """
    Convert any date format to a datetime.date object for safe use in frappe.get_doc.
    Handles multiple formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, 
    MM/DD/YYYY, and text dates like "01-Jan-2024"
    Returns a datetime.date object (not string) to bypass Frappe's internal string parser.
    """
    import datetime
    import re
    
    if not val:
        return None
    val = str(val).strip()
    if not val or val.lower() in ["none", "null", "na", "n/a"]:
        return None

    # ── Try common separators: - / . space ────────────────────────────────────
    for sep in ('-', '/', '.', ' '):
        parts = val.split(sep)
        if len(parts) != 3:
            continue
        
        try:
            a, b, c = parts[0].strip(), parts[1].strip(), parts[2].strip()

            # ── Handle text month (Jan, Feb, January, etc.) ──────────────────
            month_map = {
                "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
                "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
                "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "september": 9,
                "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12
            }
            
            # Check if middle part is text month (DD-MMM-YYYY)
            if b.lower() in month_map:
                day, month, year = int(a), month_map[b.lower()], int(c)
                if len(c) == 2:  # 2-digit year → assume 20xx
                    year = 2000 + year
                return datetime.date(year, month, day)
            
            # Check if first part is text month (MMM-DD-YYYY)
            if a.lower() in month_map:
                month, day, year = month_map[a.lower()], int(b), int(c)
                if len(c) == 2:
                    year = 2000 + year
                return datetime.date(year, month, day)

            # ── Numeric-only dates ────────────────────────────────────────────
            # YYYY-??-?? format (year first)
            if len(a) == 4:
                year, p1, p2 = int(a), int(b), int(c)
                # If p1 > 12, it must be day → YYYY-DD-MM, swap to YYYY-MM-DD
                if p1 > 12:
                    month, day = p2, p1
                else:
                    # Could be YYYY-MM-DD or YYYY-DD-MM — assume MM-DD (US common)
                    month, day = p1, p2
                return datetime.date(year, month, day)

            # DD-MM-YYYY or MM-DD-YYYY (day/month first, year last)
            if len(c) == 4:
                year = int(c)
                p1, p2 = int(a), int(b)
                
                # Disambiguate: if p1 > 12, it's definitely DD-MM-YYYY
                if p1 > 12:
                    day, month = p1, p2
                # If p2 > 12, it's MM-DD-YYYY
                elif p2 > 12:
                    month, day = p1, p2
                # Both <= 12: assume DD-MM-YYYY (Indian format common)
                else:
                    day, month = p1, p2
                
                return datetime.date(year, month, day)
            
            # 2-digit year at end (DD-MM-YY) → assume 20YY
            if len(c) == 2:
                year = 2000 + int(c)
                p1, p2 = int(a), int(b)
                if p1 > 12:
                    day, month = p1, p2
                else:
                    day, month = p1, p2  # Assume DD-MM
                return datetime.date(year, month, day)

        except (ValueError, TypeError):
            continue

    # ── Try ISO format directly (YYYYMMDD) ────────────────────────────────────
    if len(val) == 8 and val.isdigit():
        try:
            return datetime.datetime.strptime(val, "%Y%m%d").date()
        except ValueError:
            pass

    # ── Last resort: Use Frappe's getdate (handles many formats) ──────────────
    try:
        from frappe.utils import getdate
        return getdate(val)
    except Exception:
        pass

    return None  # Return None for unparseable dates instead of crashing


@frappe.whitelist()
def create_support_staff(data):
    """
    Create a new Employee (Support Staff) from the portal.
    Only HR and Admins are allowed.
    """
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized to create employees"), frappe.PermissionError)

    if isinstance(data, str):
        import json
        data = json.loads(data)

    # Fetch existing columns and resolve custom field name aliases
    _emp_cols = {r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`")}
    _pan_col = "custom_pan_number" if "custom_pan_number" in _emp_cols else "pan_number" if "pan_number" in _emp_cols else None
    _aadhaar_col = "custom_aadhar_number" if "custom_aadhar_number" in _emp_cols else "aadhar_number" if "aadhar_number" in _emp_cols else None
    _uhid_col = "custom_uhid_number" if "custom_uhid_number" in _emp_cols else "uhid_number" if "uhid_number" in _emp_cols else None

    # Validations
    if data.get("employee_number") and frappe.db.exists("Employee", {"employee_number": data.get("employee_number")}):
        frappe.throw(_("Employee Code {0} already exists").format(data.get("employee_number")))

    if data.get("pan_number") and _pan_col and frappe.db.exists("Employee", {_pan_col: data.get("pan_number")}):
        frappe.throw(_("PAN Number {0} is already registered with another employee").format(data.get("pan_number")))

    if data.get("aadhaar_card_number") and _aadhaar_col and frappe.db.exists("Employee", {_aadhaar_col: data.get("aadhaar_card_number")}):
        frappe.throw(_("Aadhaar Number is already registered with another employee"))

    if data.get("uhid_number") and _uhid_col and frappe.db.exists("Employee", {_uhid_col: data.get("uhid_number")}):
        frappe.throw(_("UHID Number {0} is already registered with another employee").format(data.get("uhid_number")))
    
    # Date Validations
    doj = getdate(data.get("date_of_joining")) if data.get("date_of_joining") else None
    doc = getdate(data.get("final_confirmation_date")) if data.get("final_confirmation_date") else None
    if doj and doc and date_diff(doc, doj) < 0:
        frappe.throw(_("Date of Confirmation cannot be earlier than Date of Joining"))

    # Reporting Manager Validation
    if data.get("reports_to") and not frappe.db.exists("Employee", data.get("reports_to")):
        frappe.throw(_("Reporting Manager {0} does not exist").format(data.get("reports_to")))

    # Prepare Employee Doc
    # Map incoming data to standard Frappe/HRMS fields
    emp_data = {
        "doctype": "Employee",
        "employee_number": data.get("employee_number"),
        "first_name": data.get("first_name"),
        "middle_name": data.get("middle_name"),
        "last_name": data.get("last_name"),
        "gender": data.get("gender"),
        "date_of_birth": _parse_date(data.get("date_of_birth")),
        "date_of_joining": _parse_date(data.get("date_of_joining")),
        "final_confirmation_date": _parse_date(data.get("final_confirmation_date")),
        "status": "Active",
        "company": data.get("company") or frappe.defaults.get_global_default("company"),
        "department": data.get("department"),
        "designation": data.get("designation"),
        "branch": data.get("branch"),
        "sahayog_branch": data.get("sol_id"),
        "sol_id": data.get("sol_id"),
        "reports_to": data.get("reports_to"),
        "cell_number": data.get("mobile_number"),
        "personal_email": data.get("personal_email"),
        "bank_name": data.get("bank_name"),
        "bank_ac_no": data.get("bank_account_number"),
        "marital_status": data.get("marital_status"),
        "blood_group": data.get("blood_group"),
        "permanent_address": data.get("permanent_address"),
        "current_address": data.get("current_address"),
        "relieving_date": data.get("relieving_date"),
        "resignation_letter_date": data.get("resignation_letter_date"),
        "default_shift": data.get("shift"),
        "employment_type": data.get("employment_type"),

        "custom_is_support_staff": 1,
        "custom_medical_deduction": 100,
    }
    if _pan_col:
        emp_data[_pan_col] = data.get("pan_number")
    if _aadhaar_col:
        emp_data[_aadhaar_col] = data.get("aadhaar_card_number")
    if _uhid_col:
        emp_data[_uhid_col] = data.get("uhid_number")

    new_emp = frappe.get_doc(emp_data)
    new_emp.insert(ignore_permissions=True, ignore_links=True, ignore_mandatory=True)

    # Set optional custom fields via raw SQL to bypass meta validation
    col_map = {
        "ctc": data.get("monthly_gross_salary"),
    }
    # Auto-fetch zone/region/district from Sahayog Branch if sol_id provided
    if data.get("sol_id") and frappe.db.exists("Sahayog Branch", data.get("sol_id")):
        branch_doc = frappe.db.get_value("Sahayog Branch", data.get("sol_id"),
            ["zone", "region", "district"], as_dict=True)
        col_map["custom_zone"] = branch_doc.get("zone")
        col_map["custom_region"] = branch_doc.get("region")
        col_map["custom_district"] = branch_doc.get("district")
    else:
        col_map["custom_zone"] = data.get("zone")
        col_map["custom_region"] = data.get("region")
        col_map["custom_district"] = data.get("district_name")

    existing_cols = [r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`")]
    for col, val in col_map.items():
        if val and col in existing_cols:
            frappe.db.sql(f"UPDATE `tabEmployee` SET `{col}`=%s WHERE name=%s", (val, new_emp.name))
    
    return {
        "success": True,
        "message": _("Employee {0} created successfully").format(new_emp.name),
        "employee": new_emp.name
    }

@frappe.whitelist()
def bulk_import_employees(rows, mode="insert"):
    import json

    # ── Permission check ──────────────────────────────────────────────────────
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    if isinstance(rows, str):
        rows = json.loads(rows)

    # ── Logger setup (writes to frappe.log / Error Log) ──────────────────────
    logger = frappe.logger("bulk_employee_import", allow_site=True, max_size=5, file_count=3)
    logger.info(f"[BulkImport] Started — {len(rows)} row(s) received by user: {frappe.session.user}, mode: {mode}")

    results = {"created": 0, "failed": 0, "skipped": 0, "updated": 0, "errors": []}

    # ── Only these fields are validated as mandatory during import ────────────
    MANDATORY_FIELDS = {
        "first_name": "First Name",
        "last_name": "Last Name",
        "gender": "Gender",
        "date_of_joining": "Date of Joining",
        "designation": "Designation",
        "department": "Department",
    }

    # ── Fetch table columns ONCE outside the loop ─────────────────────────────
    existing_cols = set(r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`"))

    # ── Tell Frappe this is a bulk import ─────────────────────────────────────
    frappe.flags.in_import = True

    for i, row in enumerate(rows, start=2):
        emp_label = (
            (row.get("first_name") or "") + " " + (row.get("last_name") or "")
        ).strip() or f"Row {i}"

        try:
            # ── 1. Mandatory field validation ─────────────────────────────────
            missing = []
            for field, label in MANDATORY_FIELDS.items():
                if not row.get(field):
                    missing.append(label)
            if missing:
                reason = f"Missing mandatory fields: {', '.join(missing)}"
                logger.warning(f"[BulkImport] Row {i} ({emp_label}) SKIPPED — {reason}")
                results["failed"] += 1
                results["errors"].append({"row": i, "name": emp_label, "error": reason})
                continue

            # ── Resolve custom field column names for this DB ──────────────────
            _pan_col = "custom_pan_number" if "custom_pan_number" in existing_cols else "pan_number" if "pan_number" in existing_cols else None
            _aadhaar_col = "custom_aadhar_number" if "custom_aadhar_number" in existing_cols else "aadhar_number" if "aadhar_number" in existing_cols else None
            _uhid_col = "custom_uhid_number" if "custom_uhid_number" in existing_cols else "uhid_number" if "uhid_number" in existing_cols else None

            # ── 2. Duplicate checks (strongest ID first) ──────────────────────
            existing_employee = None

            if row.get("uhid_number") and _uhid_col:
                dup = frappe.db.exists("Employee", {_uhid_col: row["uhid_number"]})
                if dup:
                    existing_employee = dup
                    logger.info(f"[BulkImport] Row {i} ({emp_label}) — matched existing by UHID '{row['uhid_number']}' -> {dup}")

            if not existing_employee and row.get("pan_number") and _pan_col:
                dup = frappe.db.exists("Employee", {_pan_col: row["pan_number"]})
                if dup:
                    existing_employee = dup
                    logger.info(f"[BulkImport] Row {i} ({emp_label}) — matched existing by PAN '{row['pan_number']}' -> {dup}")

            if not existing_employee and row.get("aadhaar_card_number") and _aadhaar_col:
                dup = frappe.db.exists("Employee", {_aadhaar_col: row["aadhaar_card_number"]})
                if dup:
                    existing_employee = dup
                    logger.info(f"[BulkImport] Row {i} ({emp_label}) — matched existing by Aadhaar '{row['aadhaar_card_number']}' -> {dup}")

            # Name-based duplicate check — always runs regardless of IDs
            if not existing_employee:
                parts = [
                    (row.get('first_name') or '').strip(),
                    (row.get('middle_name') or '').strip(),
                    (row.get('last_name') or '').strip()
                ]
                parts = [p for p in parts if p]
                full_name = " ".join(parts)
                doj_val = _parse_date(row.get("date_of_joining"))

                if not doj_val:
                    logger.warning(f"[BulkImport] Row {i} ({emp_label}) — could not parse DOJ '{row.get('date_of_joining')}', trying name-only match")

                if full_name:
                    # Primary: exact match
                    filters = {
                        "employee_name": full_name,
                        "custom_is_support_staff": 1
                    }
                    if doj_val:
                        filters["date_of_joining"] = doj_val

                    name_dup = frappe.db.exists("Employee", filters)
                    if name_dup:
                        existing_employee = name_dup
                        logger.info(f"[BulkImport] Row {i} ({emp_label}) — matched existing by Name+DOJ -> {name_dup}")
                    else:
                        # Fallback: compare removing all spaces, case-insensitive
                        sql = "SELECT name FROM `tabEmployee` WHERE REPLACE(UPPER(employee_name), ' ', '') = REPLACE(UPPER(%s), ' ', '')"
                        params = [full_name]
                        if doj_val:
                            sql += " AND date_of_joining = %s"
                            params.append(doj_val)
                        sql += " AND custom_is_support_staff = 1 LIMIT 1"
                        dup_name = frappe.db.sql(sql, params)
                        if dup_name:
                            existing_employee = dup_name[0][0]
                            logger.info(f"[BulkImport] Row {i} ({emp_label}) — matched existing by Name+DOJ (fallback) -> {existing_employee}")

                    # Final fallback: name-only match (for records with NULL DOJ in DB)
                    if not existing_employee and doj_val:
                        sql_no_doj = """
                            SELECT name FROM `tabEmployee`
                            WHERE REPLACE(UPPER(employee_name), ' ', '') = REPLACE(UPPER(%s), ' ', '')
                            AND custom_is_support_staff = 1
                            ORDER BY creation ASC
                            LIMIT 1
                        """
                        dup_by_name = frappe.db.sql(sql_no_doj, [full_name])
                        if dup_by_name:
                            existing_employee = dup_by_name[0][0]
                            logger.info(f"[BulkImport] Row {i} ({emp_label}) — matched existing by Name-only (DOJ was NULL in DB) -> {existing_employee}")

            if existing_employee:
                if mode == "insert":
                    reason = f"Already exists — {existing_employee}"
                    logger.info(f"[BulkImport] Row {i} ({emp_label}) SKIPPED — {reason}")
                    results["skipped"] += 1
                    results["errors"].append({"row": i, "name": emp_label, "error": reason})
                    continue
                else:
                    # ── Update mode: fill missing fields using direct SQL ──────
                    logger.info(f"[BulkImport] Row {i} ({emp_label}) — updating existing {existing_employee}")
                    emp = frappe.db.get_value("Employee", existing_employee, "*", as_dict=True)
                    updated_fields = []

                    field_map = {
                        "first_name": ("first_name", lambda v: v.strip()),
                        "middle_name": ("middle_name", lambda v: v.strip()),
                        "last_name": ("last_name", lambda v: v.strip()),
                        "gender": ("gender", lambda v: v.strip()),
                        "date_of_birth": ("date_of_birth", lambda v: _parse_date(v)),
                        "date_of_joining": ("date_of_joining", lambda v: _parse_date(v)),
                        "final_confirmation_date": ("final_confirmation_date", lambda v: _parse_date(v)),
                        "relieving_date": ("relieving_date", lambda v: _parse_date(v)),
                        "resignation_letter_date": ("resignation_letter_date", lambda v: _parse_date(v)),
                        "designation": ("designation", lambda v: v.strip()),
                        "department": ("department", lambda v: v.strip()),
                        "branch": ("branch", lambda v: v.strip()),
                        "sol_id": ("sol_id", lambda v: v.strip()),
                        "sahayog_branch": ("sahayog_branch", lambda v: v.strip()),
                        "mobile_number": ("cell_number", lambda v: v.strip()),
                        "personal_email": ("personal_email", lambda v: v.strip()),
                        "bank_name": ("bank_name", lambda v: v.strip()),
                        "bank_account_number": ("bank_ac_no", lambda v: v.strip()),
                        "marital_status": ("marital_status", lambda v: v.strip()),
                        "blood_group": ("blood_group", lambda v: v.strip()),
                        "permanent_address": ("permanent_address", lambda v: v.strip()),
                        "shift": ("default_shift", lambda v: v.strip()),
                        "employment_type": ("employment_type", lambda v: v.strip()),
                    }

                    update_dict = {}
                    for csv_key, (doc_field, transform) in field_map.items():
                        csv_val = row.get(csv_key)
                        if csv_val:
                            parsed = transform(csv_val)
                            if parsed is not None and parsed != "" and not emp.get(doc_field):
                                update_dict[doc_field] = parsed
                                updated_fields.append(doc_field)

                    custom_map = {}
                    if _pan_col:
                        custom_map["pan_number"] = _pan_col
                    if _aadhaar_col:
                        custom_map["aadhaar_card_number"] = _aadhaar_col
                    if _uhid_col:
                        custom_map["uhid_number"] = _uhid_col
                    for csv_key, doc_field in custom_map.items():
                        csv_val = row.get(csv_key)
                        if csv_val and not emp.get(doc_field):
                            update_dict[doc_field] = csv_val
                            updated_fields.append(doc_field)

                    if update_dict:
                        frappe.db.set_value("Employee", existing_employee, update_dict)
                        results["updated"] += 1
                        logger.info(f"[BulkImport] Row {i} ({emp_label}) — updated fields: {', '.join(updated_fields)}")

                        # Also update SQL-level fields if needed
                        col_map = {}
                        if row.get("monthly_gross_salary") and not emp.get("ctc"):
                            col_map["ctc"] = row.get("monthly_gross_salary")

                        sol_id = row.get("sol_id")
                        if sol_id:
                            clean_sol = sol_id.strip().replace(" ", "")
                            branch = frappe.db.sql("""
                                SELECT name FROM `tabSahayog Branch`
                                WHERE REPLACE(name, ' ', '') = %s
                                LIMIT 1
                            """, clean_sol)
                            if branch:
                                if not emp.get("sahayog_branch"):
                                    col_map["sahayog_branch"] = branch[0][0]
                                branch_doc = frappe.db.get_value(
                                    "Sahayog Branch", branch[0][0],
                                    ["zone", "region", "district"], as_dict=True
                                )
                                for col in ("custom_zone", "custom_region", "custom_district"):
                                    if not emp.get(col):
                                        col_map[col] = branch_doc.get(col.replace("custom_", ""))

                        for col, val in col_map.items():
                            if val and col in existing_cols:
                                frappe.db.sql(
                                    f"UPDATE `tabEmployee` SET `{col}`=%s WHERE name=%s",
                                    (val, existing_employee)
                                )

                        frappe.db.commit()
                    else:
                        logger.info(f"[BulkImport] Row {i} ({emp_label}) — no empty fields to update")
                        results["skipped"] += 1
                    continue

            # ── 3. Date range validation ───────────────────────────────────────
            doj = _parse_date(row.get("date_of_joining"))
            conf_date = _parse_date(row.get("final_confirmation_date"))
            if doj and conf_date and (conf_date - doj).days < 0:
                reason = "Final Confirmation Date cannot be earlier than Date of Joining"
                logger.warning(f"[BulkImport] Row {i} ({emp_label}) FAILED — {reason}")
                results["failed"] += 1
                results["errors"].append({"row": i, "name": emp_label, "error": reason})
                continue

            # ── 4. Reporting Manager — skip silently if not found ──────────────
            reports_to = row.get("reports_to") or None
            if reports_to and not frappe.db.exists("Employee", reports_to):
                logger.warning(
                    f"[BulkImport] Row {i} ({emp_label}) — reports_to '{reports_to}' not found, importing without manager"
                )
                reports_to = None

            # ── 4b. Parse dates and log if any raw value failed to parse ──────
            parsed_dob = _parse_date(row.get("date_of_birth"))
            parsed_doj = _parse_date(row.get("date_of_joining"))
            parsed_conf = _parse_date(row.get("final_confirmation_date"))

            if row.get("date_of_birth") and not parsed_dob:
                logger.warning(
                    f"[BulkImport] Row {i} ({emp_label}) — date_of_birth value '{row.get('date_of_birth')}' could not be parsed, will be saved as blank"
                )
            if row.get("date_of_joining") and not parsed_doj:
                logger.warning(
                    f"[BulkImport] Row {i} ({emp_label}) — date_of_joining value '{row.get('date_of_joining')}' could not be parsed, will be saved as blank"
                )

            # ── 5. Create Employee document ───────────────────────────────────
            logger.info(f"[BulkImport] Row {i} ({emp_label}) — creating employee...")
            emp_data = {
                "doctype": "Employee",
                "first_name": row.get("first_name"),
                "middle_name": row.get("middle_name"),
                "last_name": row.get("last_name"),
                "gender": row.get("gender"),
                "date_of_birth": parsed_dob,
                "date_of_joining": parsed_doj,
                "final_confirmation_date": parsed_conf,
                "status": "Active",
                "company": frappe.defaults.get_global_default("company"),
                "department": row.get("department"),
                "designation": row.get("designation"),
                "branch": row.get("branch"),
                "sol_id": row.get("sol_id"),
                "reports_to": reports_to,
                "cell_number": row.get("mobile_number"),
                "personal_email": row.get("personal_email"),
                "bank_name": row.get("bank_name"),
                "bank_ac_no": row.get("bank_account_number"),
                "marital_status": row.get("marital_status"),
                "blood_group": row.get("blood_group"),
                "permanent_address": row.get("permanent_address"),
                "default_shift": row.get("shift"),
                "employment_type": row.get("employment_type"),

                "custom_is_support_staff": 1,
                "custom_medical_deduction": 100,
            }
            if _pan_col:
                emp_data[_pan_col] = row.get("pan_number")
            if _aadhaar_col:
                emp_data[_aadhaar_col] = row.get("aadhaar_card_number")
            if _uhid_col:
                emp_data[_uhid_col] = row.get("uhid_number")
            new_emp = frappe.get_doc(emp_data)
            # ignore_mandatory=True because zone/region/district are filled via SQL below
            new_emp.insert(ignore_permissions=True, ignore_links=True, ignore_mandatory=True)

            # ── 6. Fill optional SQL-level fields (ctc, zone, region, district) ─
            col_map = {}

            if row.get("monthly_gross_salary"):
                col_map["ctc"] = row.get("monthly_gross_salary")

            sol_id = row.get("sol_id")
            if sol_id:
                clean_sol = sol_id.strip().replace(" ", "")
                branch = frappe.db.sql("""
                    SELECT name FROM `tabSahayog Branch`
                    WHERE REPLACE(name, ' ', '') = %s
                    LIMIT 1
                """, clean_sol)
                if branch:
                    branch_doc = frappe.db.get_value(
                        "Sahayog Branch", branch[0][0],
                        ["zone", "region", "district"], as_dict=True
                    )
                    col_map["sahayog_branch"]  = branch[0][0]
                    col_map["custom_zone"]     = branch_doc.get("zone")
                    col_map["custom_region"]   = branch_doc.get("region")
                    col_map["custom_district"] = branch_doc.get("district")
                    logger.info(
                        f"[BulkImport] Row {i} ({emp_label}) — mapped zone/region/district from Sahayog Branch '{branch[0][0]}'"
                    )
                else:
                    # Fallback: use whatever was in the CSV row
                    col_map["sahayog_branch"]  = sol_id
                    col_map["custom_zone"]     = row.get("zone")
                    col_map["custom_region"]   = row.get("region")
                    col_map["custom_district"] = row.get("district_name")
                    logger.warning(
                        f"[BulkImport] Row {i} ({emp_label}) — sol_id '{sol_id}' not found in Sahayog Branch, using CSV values for zone/region/district"
                    )
            else:
                col_map["sahayog_branch"]  = row.get("sol_id")
                col_map["custom_zone"]     = row.get("zone")
                col_map["custom_region"]   = row.get("region")
                col_map["custom_district"] = row.get("district_name")

            for col, val in col_map.items():
                if val and col in existing_cols:
                    frappe.db.sql(
                        f"UPDATE `tabEmployee` SET `{col}`=%s WHERE name=%s",
                        (val, new_emp.name)
                    )

            # Commit each employee individually so one failure doesn't roll back others
            frappe.db.commit()
            results["created"] += 1
            logger.info(f"[BulkImport] Row {i} ({emp_label}) — SUCCESS, created as '{new_emp.name}'")

        except Exception as e:
            frappe.db.rollback()
            error_msg = str(e)
            results["failed"] += 1
            results["errors"].append({"row": i, "name": emp_label, "error": error_msg})
            logger.error(
                f"[BulkImport] Row {i} ({emp_label}) — EXCEPTION: {error_msg}",
                exc_info=True
            )
            # Log to Frappe Error Log so it shows in desk
            frappe.log_error(
                message=f"Row {i} | Employee: {emp_label}\n\nError: {error_msg}",
                title="Bulk Employee Import Error"
            )

    logger.info(
        f"[BulkImport] Finished — Created: {results['created']}, "
        f"Updated: {results['updated']}, "
        f"Failed: {results['failed']}, Skipped: {results['skipped']}"
    )

    # Reset import flag
    frappe.flags.in_import = False

    return results


@frappe.whitelist()
def process_employee_exit(employee, resignation_letter_date, relieving_date, reason_for_leaving):
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    if not frappe.db.exists("Employee", employee):
        frappe.throw(_("Employee {0} not found").format(employee))

    dor = getdate(resignation_letter_date)
    dreliev = getdate(relieving_date)
    doj = getdate(frappe.db.get_value("Employee", employee, "date_of_joining"))

    if doj and dor < doj:
        frappe.throw(_("Resignation date cannot be before Date of Joining"))
    if dreliev < dor:
        frappe.throw(_("Relieving date cannot be before Resignation date"))

    frappe.db.set_value("Employee", employee, {
        "resignation_letter_date": dor,
        "relieving_date": dreliev,
        "reason_for_leaving": reason_for_leaving,
        "status": "Left"
    })

    return {"success": True, "message": _("Employee {0} has been marked as exited").format(employee)}


@frappe.whitelist()
def update_employee_profile(employee, data):
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    if isinstance(data, str):
        import json
        data = json.loads(data)

    _emp_cols = {r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`")}

    allowed_fields = [
        "cell_number", "personal_email", "permanent_address",
        "designation", "department", "branch", "reports_to",
        "bank_name", "bank_ac_no", "blood_group", "marital_status",
        "employment_type",
    ]
    # salary & loan only for HR Manager / Admin
    if any(r in roles for r in ["HR Manager", "Administrator"]):
        allowed_fields.append("ctc")
        allowed_fields.append("custom_staff_loan_emi")

    # Map frontend keys (custom_pan_number / custom_aadhar_number / custom_uhid_number) to actual DB column names
    _col_map = {}
    if "pan_number" in _emp_cols:
        _col_map["custom_pan_number"] = "pan_number"
    elif "custom_pan_number" in _emp_cols:
        allowed_fields.append("custom_pan_number")
    if "aadhar_number" in _emp_cols:
        _col_map["custom_aadhar_number"] = "aadhar_number"
    elif "custom_aadhar_number" in _emp_cols:
        allowed_fields.append("custom_aadhar_number")
    if "uhid_number" in _emp_cols:
        _col_map["custom_uhid_number"] = "uhid_number"
    elif "custom_uhid_number" in _emp_cols:
        allowed_fields.append("custom_uhid_number")

    update = {}
    for k in allowed_fields:
        if k in data:
            update[k] = data[k]
    # Remap frontend key to actual DB column
    for frontend_key, db_col in _col_map.items():
        if frontend_key in data:
            update[db_col] = data[frontend_key]
    if not update:
        frappe.throw(_("No valid fields to update"))

    frappe.db.set_value("Employee", employee, update)
    return {"success": True, "message": _("Employee {0} updated successfully").format(employee)}


@frappe.whitelist()
def get_employee_profile(employee):
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    _emp_cols = {r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`")}
    _profile_fields = [
        "name", "employee_name", "gender", "date_of_birth", "date_of_joining",
        "final_confirmation_date", "status", "relieving_date", "resignation_letter_date",
        "designation", "department", "employment_type", "branch", "sahayog_branch",
        "custom_zone", "custom_region", "custom_district",
        "cell_number", "personal_email", "permanent_address",
        "bank_name", "bank_ac_no", "reports_to",
        "marital_status", "blood_group", "ctc", "custom_staff_loan_emi",
    ]
    for f in ("custom_pan_number", "pan_number", "custom_aadhar_number", "custom_uhid_number"):
        if f in _emp_cols:
            _profile_fields.append(f)

    e = frappe.db.get_value("Employee", employee, _profile_fields, as_dict=True)

    if not e:
        frappe.throw(_("Employee not found"))

    # Normalize field keys so frontend always reads custom_pan_number / custom_aadhar_number
    if "pan_number" in e and "custom_pan_number" not in e:
        e["custom_pan_number"] = e["pan_number"]
    if "aadhar_number" in e and "custom_aadhar_number" not in e:
        e["custom_aadhar_number"] = e["aadhar_number"]
    if "uhid_number" in e and "custom_uhid_number" not in e:
        e["custom_uhid_number"] = e["uhid_number"]

    # fetch reporting manager name
    if e.get("reports_to"):
        e["reports_to_name"] = frappe.db.get_value("Employee", e.reports_to, "employee_name") or e.reports_to

    # hide salary from HR User (only HR Manager sees it)
    if "HR Manager" not in roles and "Administrator" not in roles:
        e["ctc"] = None

    return e


@frappe.whitelist()
def get_active_support_staff():
    return frappe.get_all(
        "Employee",
        filters={"custom_is_support_staff": 1, "status": "Active"},
        fields=["name", "employee_name", "designation", "branch"],
        order_by="employee_name"
    )


@frappe.whitelist()
def get_designations():
    return frappe.get_all("Designation", fields=["name"], order_by="name")

@frappe.whitelist()
def get_departments():
    return frappe.get_all("Department", fields=["name"], order_by="name")

@frappe.whitelist()
def get_divisions():
    return frappe.get_all("Division", fields=["name"], order_by="name")

@frappe.whitelist()
def get_shifts():
    return frappe.get_all("Shift Type", fields=["name"], order_by="name")

@frappe.whitelist()
def get_sahayog_branches():
    return frappe.get_all("Sahayog Branch", fields=["name"], order_by="name")

@frappe.whitelist()
def get_employment_types():
    return frappe.get_all("Employment Type", fields=["name"], order_by="name")

@frappe.whitelist()
def get_all_sol_ids():
    return frappe.get_all("Sahayog Branch", fields=["sol_id"], order_by="sol_id", filters={"sol_id": ["is", "set"]})

@frappe.whitelist()
def get_branch_details(branch):
    if not branch: return {}
    return frappe.db.get_value("Sahayog Branch", branch, ["zone", "region", "district", "state", "sol_id"], as_dict=True)

@frappe.whitelist()
def get_branch_details_by_sol_id(sol_id):
    if not sol_id: return {}
    # Since SOL ID is the name of the 'Sahayog Branch' document:
    branch_doc = frappe.get_doc("Sahayog Branch", sol_id)
    return {
        "branch": branch_doc.branch,
        "zone": branch_doc.zone,
        "region": branch_doc.region,
        "district": branch_doc.district,
        "state": branch_doc.state
    }

@frappe.whitelist()
def get_employees_for_reporting():
    return frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=["name", "employee_name", "designation"],
        order_by="employee_name"
    )


@frappe.whitelist()
def get_logged_in_employee():
    if frappe.session.user == "Administrator":
        return {
            "employee_name": "ADMIN",
            "employee": "ADMIN",
            "reports_to": "ADMIN",
            "designation": "ADMIN",
            "branch": "ADMIN",
            "custom_zone": "ADMIN",
            "custom_region": "ADMIN",
            "custom_division": "ADMIN",
            "date_of_joining": "ADMIN",
            "cell_number": "ADMIN",
            "gender": "ADMIN"
        }

    employee = frappe.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        [
            "employee_name",
            "employee",  # employee code
            "reports_to",
            "designation",
            "branch",
            "custom_zone",
            "custom_region",
            "custom_division",
            "date_of_joining",
            "cell_number",
            "gender"
        ],
        as_dict=True
    )

    if not employee:
        return {}

    # If reports_to is set (it should be an employee ID), fetch its employee_name
    if employee.get("reports_to"):
        reports_to_name = frappe.get_value(
            "Employee",
            employee["reports_to"],
            "employee_name"
        )
        employee["reports_to"] = reports_to_name or employee["reports_to"]

    return employee


@frappe.whitelist()
def get_user_tickets():
    tickets = frappe.get_all(
        "Sahayog Ticket",
        filters={"owner": frappe.session.user},
        fields=["name", "status", "priority", "creation","branch_name","employee_name","region","call_log_date","ticket_type","description"],
        order_by="creation desc"
    )
    return tickets
