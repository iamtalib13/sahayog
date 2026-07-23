import frappe
import re
from frappe import _

def custom_asset_autoname(doc, method):
    # Prefix 1: Hardcoded
    company_prefix = "SMCCSL"

    # Prefix 2: Zone (Z1, Z2, etc.)
    zone_code = ""
    if doc.zone:
        # Extract number from zone name (e.g., "Zone 3" -> "3")
        zone_digits = re.findall(r'\d+', doc.zone)
        if zone_digits:
            zone_code = f"Z{zone_digits[0]}"
        else:
            zone_code = doc.zone.upper()[:2]
    
    # Prefix 3: State Code (Mapping full name to code)
    state_mapping = {
        "Andaman and Nicobar Islands": "AN",
        "Andhra Pradesh": "AP",
        "Arunachal Pradesh": "AR",
        "Assam": "AS",
        "Bihar": "BR",
        "Chandigarh": "CH",
        "Chhattisgarh": "CT",
        "Dadra and Nagar Haveli and Daman and Diu": "DN",
        "Delhi": "DL",
        "Goa": "GA",
        "Gujarat": "GJ",
        "Haryana": "HR",
        "Himachal Pradesh": "HP",
        "Jammu and Kashmir": "JK",
        "Jharkhand": "JH",
        "Karnataka": "KA",
        "Kerala": "KL",
        "Ladakh": "LA",
        "Lakshadweep": "LD",
        "Madhya Pradesh": "MP",
        "Maharashtra": "MH",
        "Manipur": "MN",
        "Meghalaya": "ML",
        "Mizoram": "MZ",
        "Nagaland": "NL",
        "Odisha": "OR",
        "Puducherry": "PY",
        "Punjab": "PB",
        "Rajasthan": "RJ",
        "Sikkim": "SK",
        "Tamil Nadu": "TN",
        "Telangana": "TG",
        "Tripura": "TR",
        "Uttar Pradesh": "UP",
        "Uttarakhand": "UT",
        "West Bengal": "WB"
    }
    state_code = state_mapping.get(doc.state, (doc.state or "").upper()[:2])

    # Prefix 4: Sahayog Branch Name (Complete)
    location_part = (doc.location or "").strip().upper()

    # Prefix 5: Division (Matching frontend logic: initials for multi-word or first 5 unique characters)
    division_part = (doc.division or "").strip()
    if division_part:
        div_words = division_part.split()
        if len(div_words) > 1:
            division_code = "".join([w[0].upper() for w in div_words])
        else:
            seen = set()
            unique_chars = []
            for char in div_words[0].upper():
                if char not in seen:
                    seen.add(char)
                    unique_chars.append(char)
            division_code = "".join(unique_chars[:5])
    else:
        division_code = ""

    # Prefix 6: Asset Name (First 3 letters)
    asset_name_code = (doc.item_name or doc.item_code or "").strip().upper()[:3]

    # Prefix 7: Brand (Full Brand Name)
    brand_code = (doc.brand or "").strip().upper()

    # Prefix 8: Serial No (Optional, placed after brand)
    serial_part = (doc.serial_no or "").strip()

    # Construct the base prefix for serial number
    # Syntax: SMCCSL/ZONE/STATE/LOCATION/DIVISION/ASSET/BRAND/SERIAL_NO/
    parts = [
        company_prefix,
        zone_code,
        state_code,
        location_part,
        division_code,
        asset_name_code,
        brand_code
    ]
    if serial_part:
        parts.append(serial_part)
    
    # Filter out empty parts and join with /
    naming_prefix = "/".join([p for p in parts if p]) + "/"

    # Get last asset with the same prefix to determine serial number
    last = frappe.db.sql(
        """SELECT name FROM `tabAsset`
           WHERE name LIKE %s
           ORDER BY name DESC LIMIT 1""",
        (naming_prefix + "%",),
    )

    if last:
        try:
            # Extract serial number from the end
            last_number = int(last[0][0].split("/")[-1])
        except (ValueError, IndexError):
            last_number = 0
    else:
        last_number = 0

    next_number = str(last_number + 1).zfill(3)
    doc.name = f"{naming_prefix}{next_number}"


@frappe.whitelist()
def remove_serial_numbers(assets):
    import json
    if isinstance(assets, str):
        assets = json.loads(assets)

    for asset_name in assets:
        if frappe.db.exists("Asset", asset_name):
            frappe.db.set_value("Asset", asset_name, "serial_no", "")

    return {"success": True}


@frappe.whitelist()
def update_serial_number(asset, serial_no):
    if frappe.db.exists("Asset", asset):
        frappe.db.set_value("Asset", asset, "serial_no", serial_no)
        return {"success": True}
    return {"success": False, "error": "Asset not found"}


def _resolve_filepath(file_url):
    import os
    site_path = os.path.abspath(frappe.get_site_path())
    if file_url.startswith("/private/"):
        return site_path + file_url
    return site_path + "/public" + file_url


def parse_file(file_url):
    import os
    from frappe.utils.csvutils import read_csv_content
    from frappe.utils.xlsxutils import read_xlsx_file_from_attached_file

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

        if isinstance(content, bytes):
            content = content.decode("utf-8", errors="ignore")
        return read_csv_content(content) or []
    else:
        frappe.throw(_("Unsupported file format. Please upload a CSV or XLSX file"))


@frappe.whitelist()
def remove_serial_by_file(file_url):
    try:
        rows = parse_file(file_url)
        if not rows:
            return {"success": False, "error": "The uploaded file is empty."}

        # Check if first row is header
        start_row = 0
        first_cell = str(rows[0][0]).lower().strip()
        if "asset" in first_cell or "code" in first_cell:
            start_row = 1

        total_rows = 0
        serial_cleared_count = 0
        serial_not_na_count = 0
        asset_not_found_count = 0
        errors = []
        for i in range(start_row, len(rows)):
            row = rows[i]
            if not row or len(row) < 1:
                continue

            asset_code = str(row[0]).strip()
            if not asset_code or asset_code.lower() in ["none", "null", "nan", ""]:
                continue

            # Strip decimal if Excel parsed it as a float (e.g., SMCCSL/.../001.0)
            if asset_code.endswith(".0"):
                asset_code = asset_code[:-2]

            total_rows += 1

            # Read the Serial No column
            serial_no_val = ""
            if len(row) > 1 and row[1] is not None:
                serial_no_val = str(row[1]).strip()

            if serial_no_val.upper() != "N/A":
                serial_not_na_count += 1
                errors.append({
                    "row": i + 1,
                    "asset": asset_code,
                    "type": "Serial Not N/A",
                    "detail": _("Serial No is '{0}' instead of 'N/A'. Skipped.").format(serial_no_val)
                })
                continue

            if frappe.db.exists("Asset", asset_code):
                frappe.db.set_value("Asset", asset_code, "serial_no", "")
                serial_cleared_count += 1
            else:
                asset_not_found_count += 1
                errors.append({
                    "row": i + 1,
                    "asset": asset_code,
                    "type": "Asset Not Found",
                    "detail": _("Asset Code '{0}' not found.").format(asset_code)
                })

        error_count = len(errors)
        return {
            "success": True,
            "total_rows": total_rows,
            "serial_cleared_count": serial_cleared_count,
            "serial_not_na_count": serial_not_na_count,
            "asset_not_found_count": asset_not_found_count,
            "error_count": error_count,
            "errors": errors
        }
    except Exception as e:
        frappe.log_error(message=frappe.get_traceback(), title="Remove Serial File Upload Error")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def update_serial_by_file(file_url):
    try:
        rows = parse_file(file_url)
        if not rows:
            return {"success": False, "error": "The uploaded file is empty."}

        # Check if first row is header
        start_row = 0
        first_cell = str(rows[0][0]).lower().strip()
        if "asset" in first_cell or "code" in first_cell:
            start_row = 1

        total_rows = 0
        serial_set_count = 0
        serial_cleared_count = 0
        asset_not_found_count = 0
        errors = []
        for i in range(start_row, len(rows)):
            row = rows[i]
            if not row or len(row) < 1:
                continue

            asset_code = str(row[0]).strip()
            if not asset_code or asset_code.lower() in ["none", "null", "nan", ""]:
                continue

            # Strip decimal if Excel parsed it as a float
            if asset_code.endswith(".0"):
                asset_code = asset_code[:-2]

            total_rows += 1

            serial_no = ""
            if len(row) > 1 and row[1] is not None:
                val = row[1]
                if isinstance(val, float) and val.is_integer():
                    serial_no = str(int(val)).strip()
                else:
                    serial_no = str(val).strip()
                    if serial_no.endswith(".0"):
                        serial_no = serial_no[:-2]
                    if serial_no.lower() in ["none", "null", "nan"]:
                        serial_no = ""

            if not frappe.db.exists("Asset", asset_code):
                asset_not_found_count += 1
                errors.append({
                    "row": i + 1,
                    "asset": asset_code,
                    "type": "Asset Not Found",
                    "detail": _("Asset Code '{0}' not found.").format(asset_code)
                })
                continue

            # If Serial No is N/A or empty, we clear the asset serial_no
            if not serial_no or serial_no.upper() == "N/A":
                frappe.db.set_value("Asset", asset_code, "serial_no", "")
                serial_cleared_count += 1
                continue

            # Ensure Serial No record exists in "Serial No" DocType
            if not frappe.db.exists("Serial No", serial_no):
                try:
                    asset_doc = frappe.get_doc("Asset", asset_code)

                    serial_doc = frappe.get_doc({
                        "doctype": "Serial No",
                        "serial_no": serial_no,
                        "item_code": asset_doc.item_code,
                        "company": asset_doc.company,
                        "status": "Active"
                    })
                    serial_doc.insert(ignore_permissions=True)
                except Exception as ex:
                    errors.append({
                        "row": i + 1,
                        "asset": asset_code,
                        "type": "Serial Creation Failed",
                        "detail": _("Failed to create Serial No '{0}' - {1}").format(serial_no, str(ex))
                    })
                    continue

            # Set serial_no on Asset
            frappe.db.set_value("Asset", asset_code, "serial_no", serial_no)
            serial_set_count += 1

        updated_count = serial_set_count + serial_cleared_count
        error_count = len(errors)
        return {
            "success": True,
            "total_rows": total_rows,
            "serial_set_count": serial_set_count,
            "serial_cleared_count": serial_cleared_count,
            "asset_not_found_count": asset_not_found_count,
            "updated_count": updated_count,
            "error_count": error_count,
            "errors": errors
        }
    except Exception as e:
        frappe.log_error(message=frappe.get_traceback(), title="Update Serial File Upload Error")
        return {"success": False, "error": str(e)}




