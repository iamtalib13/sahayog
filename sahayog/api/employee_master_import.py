import os
import frappe
from frappe import _
from frappe.utils.csvutils import read_csv_content
from frappe.utils.xlsxutils import read_xlsx_file_from_attached_file
from frappe.utils import flt, get_datetime_str, now_datetime, getdate, today


FIELD_MAP = {
    "employee_number": "employee_number",
    "first_name": "first_name",
    "middle_name": "middle_name",
    "last_name": "last_name",
    "employee_name": "employee_name",
    "gender": "gender",
    "date_of_birth": "date_of_birth",
    "date_of_joining": "date_of_joining",
    "final_confirmation_date": "final_confirmation_date",
    "relieving_date": "relieving_date",
    "resignation_letter_date": "resignation_letter_date",
    "designation": "designation",
    "department": "department",
    "branch": "branch",
    "sol_id": "sol_id",
    "sahayog_branch": "sahayog_branch",
    "mobile_number": "cell_number",
    "personal_email": "personal_email",
    "company": "company",
    "bank_name": "bank_name",
    "bank_account_number": "bank_ac_no",
    "marital_status": "marital_status",
    "blood_group": "blood_group",
    "permanent_address": "permanent_address",
    "current_address": "current_address",
    "shift": "default_shift",
    "employment_type": "employment_type",
    "reports_to": "reports_to",
    "status": "status",
    "pan_number": "pan_number",
    "aadhaar_card_number": "aadhaar_card_number",
    "uhid_number": "uhid_number",
    "monthly_gross_salary": "ctc",
}

DEFAULT_MANDATORY = [
    "first_name",
    "gender",
    "date_of_joining",
    "designation",
    "department",
]


import math


@frappe.whitelist()
def init_import_session(mode="insert", batch_size=500):
    setting = frappe.get_doc("Sahayog HR Setting")
    file_url = setting.get("employee_master")
    if not file_url:
        frappe.throw(_("Please upload an Employee Master file first"))

    rows = _parse_file(file_url)
    if not rows or len(rows) < 2:
        frappe.throw(_("File has no data rows"))

    total_rows = len(rows) - 1
    batch_size = max(1, int(batch_size))
    total_batches = math.ceil(total_rows / batch_size)

    return {
        "total_rows": total_rows,
        "batch_size": batch_size,
        "total_batches": total_batches,
    }


@frappe.whitelist()
def process_import_batch(mode="insert", batch_index=0, batch_size=500):
    setting = frappe.get_doc("Sahayog HR Setting")
    file_url = setting.get("employee_master")
    if not file_url:
        frappe.throw(_("Please upload an Employee Master file first"))

    table_mappings = _load_table_mappings(setting)
    mandatory_fields = _get_mandatory_fields(table_mappings)

    rows = _parse_file(file_url)
    if not rows or len(rows) < 2:
        frappe.throw(_("File has no data rows"))

    headers = [h.strip().lower().replace(" ", "_") for h in rows[0]]
    data_rows = rows[1:]

    existing_cols = set(r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`"))
    valid_field_map = _build_field_map(headers, existing_cols, table_mappings)
    header_for = {v: k for k, v in valid_field_map.items()}

    batch_index = int(batch_index)
    batch_size = int(batch_size)

    start_idx = batch_index * batch_size
    end_idx = min((batch_index + 1) * batch_size, len(data_rows))
    batch_rows = data_rows[start_idx:end_idx]

    result = {
        "inserted": 0,
        "updated": 0,
        "skipped": 0,
        "failed": 0,
        "errors": [],
        "inserted_numbers": [],
        "updated_numbers": [],
    }

    frappe.flags.in_import = True

    for offset, row in enumerate(batch_rows):
        i = start_idx + offset + 2
        row_dict = _row_to_dict(headers, row)
        emp_number = row_dict.get(header_for.get("employee_number", "employee_number"), "").strip()
        emp_label = row_dict.get(header_for.get("first_name", "first_name"), "") or f"Row {i}"

        try:
            if not emp_number:
                result["failed"] += 1
                result["errors"].append(f"Row {i}: {emp_label} - employee_number is missing")
                continue

            for f in mandatory_fields:
                csv_key = header_for.get(f, f)
                if not row_dict.get(csv_key):
                    result["failed"] += 1
                    result["errors"].append(f"Row {i}: {emp_number} - {f} is required")
                    raise _StopRow()

            existing_emp_name = frappe.db.exists("Employee", {"employee_number": emp_number})

            if mode == "insert":
                if existing_emp_name:
                    result["skipped"] += 1
                else:
                    _create_employee(row_dict, valid_field_map)
                    result["inserted"] += 1
                    result["inserted_numbers"].append(emp_number)

            elif mode == "update":
                if not existing_emp_name:
                    result["skipped"] += 1
                else:
                    _update_employee(existing_emp_name, row_dict, valid_field_map)
                    result["updated"] += 1
                    result["updated_numbers"].append(emp_number)

        except _StopRow:
            continue
        except Exception as e:
            frappe.db.rollback()
            result["failed"] += 1
            result["errors"].append(f"Row {i}: {emp_number or emp_label} - {str(e)}")

    frappe.flags.in_import = False
    frappe.db.commit()

    return result


@frappe.whitelist()
def finish_import_session(summary_data, mode="insert"):
    if isinstance(summary_data, str):
        import json
        summary_data = json.loads(summary_data)

    summary = _build_summary(summary_data, mode)
    frappe.db.set_value("Sahayog HR Setting", None, "employee_import_summary", summary)
    frappe.db.commit()

    return summary


@frappe.whitelist()
def import_employee_master(mode="insert"):
    init_res = init_import_session(mode=mode, batch_size=500)
    total_batches = init_res["total_batches"]

    aggregated = {
        "inserted": 0,
        "updated": 0,
        "skipped": 0,
        "failed": 0,
        "errors": [],
        "inserted_numbers": [],
        "updated_numbers": [],
    }

    for b in range(total_batches):
        batch_res = process_import_batch(mode=mode, batch_index=b, batch_size=500)
        aggregated["inserted"] += batch_res.get("inserted", 0)
        aggregated["updated"] += batch_res.get("updated", 0)
        aggregated["skipped"] += batch_res.get("skipped", 0)
        aggregated["failed"] += batch_res.get("failed", 0)
        aggregated["errors"].extend(batch_res.get("errors", []))
        aggregated["inserted_numbers"].extend(batch_res.get("inserted_numbers", []))
        aggregated["updated_numbers"].extend(batch_res.get("updated_numbers", []))

    return finish_import_session(aggregated, mode=mode)


def _resolve_filepath(file_url):
    site_path = os.path.abspath(frappe.get_site_path())
    if file_url.startswith("/private/"):
        return site_path + file_url
    return site_path + "/public" + file_url


def _parse_file(file_url):
    if file_url.lower().endswith(".xlsx"):
        try:
            return read_xlsx_file_from_attached_file(file_url=file_url) or []
        except Exception:
            return read_xlsx_file_from_attached_file(filepath=_resolve_filepath(file_url)) or []

    elif file_url.lower().endswith(".csv"):
        try:
            file_doc = frappe.get_doc("File", {"file_url": file_url})
            content = file_doc.get_content()
        except Exception:
            with open(_resolve_filepath(file_url), "rb") as f:
                content = f.read()
        return read_csv_content(content) or []

    else:
        frappe.throw(_("Unsupported file format. Please upload a CSV or XLSX file"))


def _load_table_mappings(setting):
    if not setting.get("field_mappings"):
        return None
    mappings = []
    for row in setting.field_mappings:
        mappings.append({
            "source_column": row.source_column,
            "target_field": row.target_field,
            "is_mandatory": row.is_mandatory,
        })
    return mappings


def _get_mandatory_fields(table_mappings):
    if table_mappings:
        return [m["source_column"] for m in table_mappings if m.get("is_mandatory")]
    return DEFAULT_MANDATORY


def _build_field_map(headers, existing_cols, table_mappings=None):
    mapping = {}
    if table_mappings:
        for m in table_mappings:
            src = m.get("source_column", "").strip().lower().replace(" ", "_")
            tgt = m.get("target_field", "").strip()
            if src and tgt and tgt in existing_cols and src in headers:
                mapping[src] = tgt
        return mapping

    for h in headers:
        clean = h.strip().lower().replace(" ", "_")
        doc_field = FIELD_MAP.get(clean, clean)
        if doc_field in existing_cols:
            mapping[clean] = doc_field
    return mapping


def _row_to_dict(headers, row):
    d = {}
    for idx, h in enumerate(headers):
        val = row[idx] if idx < len(row) else None
        if val is not None:
            val = str(val).strip()
        d[h] = val
    return d


def _ensure_link(val, target_doctype, label_field, name_prefix=None):
    if not val:
        return val
    val = val.strip()
    if not val:
        return val

    if name_prefix:
        clean = val.replace(" ", "").upper()
        if not clean.startswith(name_prefix):
            clean = name_prefix + clean
    else:
        clean = val.title()

    existing = frappe.db.get_value(target_doctype, {label_field: clean}, "name")
    if existing:
        return existing

    if not frappe.db.exists(target_doctype, clean):
        frappe.get_doc({
            "doctype": target_doctype,
            label_field: clean,
        }).insert(ignore_permissions=True)
    return clean


def _split_name(first_name, middle_name=None, last_name=None):
    if not first_name:
        return first_name, middle_name, last_name
    parts = [p for p in first_name.strip().split() if p]
    if len(parts) == 1:
        return parts[0], middle_name, last_name
    if middle_name or last_name:
        return first_name, middle_name, last_name
    if len(parts) == 2:
        return parts[0], None, parts[1]
    if len(parts) == 3:
        return parts[0], parts[1], parts[2]
    if len(parts) == 4:
        return " ".join(parts[:3]), None, parts[3]
    return first_name, middle_name, last_name


def _create_employee(row_dict, field_map):
    parsed = _prepare_employee_data(row_dict, field_map)

    fn = parsed.get("first_name")
    mn = parsed.get("middle_name")
    ln = parsed.get("last_name")
    first_name, middle_name, last_name = _split_name(fn, mn, ln)
    if first_name:
        parsed["first_name"] = first_name
    if middle_name:
        parsed["middle_name"] = middle_name
    elif "middle_name" in parsed:
        del parsed["middle_name"]
    if last_name:
        parsed["last_name"] = last_name
    elif "last_name" in parsed:
        del parsed["last_name"]

    link_fields = [
        ("custom_division", "Division", "division", None),
        ("custom_zone", "Zone", "zone", "ZONE-"),
        ("custom_region", "Region", "region", "REGION-"),
        ("branch", "Branch", "branch", None),
        ("designation", "Designation", "designation_name", None),
    ]
    for field, doctype, label, prefix in link_fields:
        val = parsed.get(field)
        if val:
            parsed[field] = _ensure_link(val, doctype, label, prefix)

    sb_val = parsed.get("sahayog_branch")
    if sb_val and not frappe.db.exists("Sahayog Branch", sb_val):
        del parsed["sahayog_branch"]

    dep_val = parsed.get("department")
    if dep_val:
        existing = frappe.db.get_value("Department", {"department_name": dep_val}, "name")
        if existing:
            parsed["department"] = existing
        else:
            company = frappe.defaults.get_global_default("company")
            new = frappe.get_doc({
                "doctype": "Department",
                "department_name": dep_val.title(),
                "company": company,
            }).insert(ignore_permissions=True)
            parsed["department"] = new.name

    rt_val = parsed.get("reports_to")
    if rt_val and not frappe.db.exists("Employee", rt_val):
        del parsed["reports_to"]

    parsed["custom_is_support_staff"] = 1
    parsed["custom_medical_deduction"] = 100

    if not parsed.get("status"):
        parsed["status"] = "Active"
    if not parsed.get("company"):
        parsed["company"] = frappe.defaults.get_global_default("company")

    doc = frappe.get_doc(parsed)
    doc.insert(ignore_permissions=True, ignore_links=True, ignore_mandatory=True)
    _set_sol_fields(doc, row_dict)
    frappe.db.commit()


def _update_employee(emp_name, row_dict, field_map):
    doc = frappe.get_doc("Employee", emp_name)
    header_for = {v: k for k, v in field_map.items()}

    date_fields = {
        "date_of_birth": _parse_date,
        "date_of_joining": _parse_date,
        "final_confirmation_date": _parse_date,
        "relieving_date": _parse_date,
        "resignation_letter_date": _parse_date,
    }

    link_map = {
        "custom_division": ("Division", "division", None),
        "custom_zone": ("Zone", "zone", "ZONE-"),
        "custom_region": ("Region", "region", "REGION-"),
        "branch": ("Branch", "branch", None),
        "designation": ("Designation", "designation_name", None),
    }

    skip_names = {"first_name", "middle_name", "last_name"}

    for csv_key, doc_field in field_map.items():
        csv_val = row_dict.get(csv_key)
        if not csv_val or doc_field in skip_names:
            continue

        if doc_field in date_fields:
            parsed = date_fields[doc_field](csv_val)
            if parsed:
                setattr(doc, doc_field, parsed)
        elif doc_field == "ctc":
            try:
                doc.ctc = flt(csv_val)
            except:
                pass
        elif doc_field in link_map:
            doctype, label, prefix = link_map[doc_field]
            setattr(doc, doc_field, _ensure_link(csv_val, doctype, label, prefix))
        elif doc_field == "sahayog_branch":
            if frappe.db.exists("Sahayog Branch", csv_val):
                doc.sahayog_branch = csv_val
        elif doc_field == "department":
            existing = frappe.db.get_value("Department", {"department_name": csv_val}, "name")
            if existing:
                doc.department = existing
            else:
                company = frappe.defaults.get_global_default("company")
                new = frappe.get_doc({
                    "doctype": "Department",
                    "department_name": csv_val.title(),
                    "company": company,
                }).insert(ignore_permissions=True)
                doc.department = new.name
        elif doc_field == "reports_to":
            if frappe.db.exists("Employee", csv_val):
                doc.reports_to = csv_val
        else:
            setattr(doc, doc_field, csv_val)

    csv_first_name = row_dict.get(header_for.get("first_name"))
    csv_middle_name = row_dict.get(header_for.get("middle_name"))
    csv_last_name = row_dict.get(header_for.get("last_name"))
    if csv_first_name:
        fn, mn, ln = _split_name(
            csv_first_name,
            csv_middle_name if csv_middle_name and not doc.get("middle_name") else None,
            csv_last_name if csv_last_name and not doc.get("last_name") else None,
        )
        if fn and fn != doc.first_name:
            doc.first_name = fn
        if mn and mn != doc.middle_name:
            doc.middle_name = mn
        if ln and ln != doc.last_name:
            doc.last_name = ln

    _set_sol_fields(doc, row_dict)
    doc.flags.ignore_mandatory = True
    doc.save(ignore_permissions=True)

    relieving = doc.relieving_date
    if relieving and getdate(relieving) <= getdate(today()):
        doc.status = "Left"
        if doc.user_id and frappe.db.exists("User", doc.user_id):
            user = frappe.get_doc("User", doc.user_id)
            user.enabled = 0
            user.save(ignore_permissions=True)
        doc.flags.ignore_mandatory = True
        doc.save(ignore_permissions=True)

    frappe.db.commit()


def _set_sol_fields(doc, row_dict):
    existing_cols = set(r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`"))

    sol_id = row_dict.get("sol_id")
    if sol_id:
        clean_sol = sol_id.strip().replace(" ", "")
        branch = frappe.db.sql(
            """SELECT name FROM `tabSahayog Branch`
               WHERE REPLACE(name, ' ', '') = %s LIMIT 1""",
            clean_sol,
        )
        if branch:
            branch_doc = frappe.db.get_value(
                "Sahayog Branch", branch[0][0],
                ["zone", "region", "district"], as_dict=True
            )
            if "sahayog_branch" in existing_cols and not doc.get("sahayog_branch"):
                doc.sahayog_branch = branch[0][0]
            if "custom_zone" in existing_cols and not doc.get("custom_zone"):
                z_val = branch_doc.get("zone")
                if z_val:
                    doc.custom_zone = _ensure_link(z_val, "Zone", "zone", "ZONE-")
            if "custom_region" in existing_cols and not doc.get("custom_region"):
                r_val = branch_doc.get("region")
                if r_val:
                    doc.custom_region = _ensure_link(r_val, "Region", "region", "REGION-")
            if "custom_district" in existing_cols and not doc.get("custom_district"):
                doc.custom_district = branch_doc.get("district")

    monthly_sal = row_dict.get("monthly_gross_salary")
    if monthly_sal:
        try:
            if "ctc" in existing_cols and not doc.get("ctc"):
                doc.ctc = flt(monthly_sal)
        except:
            pass


def _prepare_employee_data(row_dict, field_map):
    data = {"doctype": "Employee"}

    date_fields = {
        "date_of_birth": "date_of_birth",
        "date_of_joining": "date_of_joining",
        "final_confirmation_date": "final_confirmation_date",
        "relieving_date": "relieving_date",
        "resignation_letter_date": "resignation_letter_date",
    }

    for csv_key, doc_field in field_map.items():
        val = row_dict.get(csv_key)
        if not val:
            continue

        if doc_field in date_fields:
            parsed = _parse_date(val)
            if parsed:
                data[doc_field] = parsed
        elif doc_field == "cell_number":
            data["cell_number"] = val
        elif doc_field == "ctc":
            try:
                data["ctc"] = flt(val)
            except:
                pass
        else:
            data[doc_field] = val

    return data


def _parse_date(val):
    if not val:
        return None
    val = str(val).strip()
    if not val or val.lower() in ("none", "null", "na", "n/a", ""):
        return None
    for sep in ("-", "/", ".", " "):
        parts = val.split(sep)
        if len(parts) != 3:
            continue
        try:
            from frappe.utils import getdate
            return getdate(val)
        except:
            continue
    try:
        from frappe.utils import getdate
        return getdate(val)
    except:
        return None


def _build_summary(result, mode):
    now = now_datetime()
    date_str = now.strftime("%d/%m/%Y %I:%M %p")

    lines = []
    lines.append(f"Import on {date_str}")
    lines.append("")

    if mode == "insert":
        lines.append(f"Inserted: {result['inserted']}")
        if result["inserted"]:
            nums = sorted(result["inserted_numbers"])
            if len(nums) == 1:
                lines.append(f"  Employee No: {nums[0]}")
            elif nums:
                lines.append(f"  Employee No: {nums[0]} to {nums[-1]}")
    else:
        lines.append(f"Updated: {result['updated']}")
        if result["updated"]:
            nums = sorted(result["updated_numbers"])
            if len(nums) == 1:
                lines.append(f"  Employee No: {nums[0]}")
            elif nums:
                lines.append(f"  Employee No: {nums[0]} to {nums[-1]}")

    lines.append(f"Skipped: {result['skipped']}")
    lines.append(f"Failed: {result['failed']}")

    if result["errors"]:
        lines.append("")
        lines.append("Errors:")
        for err in result["errors"][:20]:
            lines.append(f"  {err}")
        if len(result["errors"]) > 20:
            lines.append(f"  ... and {len(result['errors']) - 20} more")

    return "\n".join(lines)


class _StopRow(Exception):
    pass
