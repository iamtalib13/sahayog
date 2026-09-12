import frappe
from frappe import _
import csv
import io
import os


def cancel_linked_docs(asset_name):
    """Cancel and delete all linked documents before cancelling the Asset."""

    # Delete linked Asset Activities (non-submittable log)
    activities = frappe.get_all(
        "Asset Activity",
        filters={"asset": asset_name},
        pluck="name",
    )
    for activity_name in activities:
        frappe.delete_doc("Asset Activity", activity_name, ignore_permissions=True)
        frappe.db.commit()

    # Cancel linked Asset Movements (via child table)
    movements = frappe.db.sql(
        """SELECT DISTINCT asm.name
        FROM `tabAsset Movement` asm
        INNER JOIN `tabAsset Movement Item` asm_item ON asm_item.parent = asm.name
        WHERE asm_item.asset = %s AND asm.docstatus = 1""",
        asset_name,
        as_dict=True,
    )
    for movement in movements:
        doc = frappe.get_doc("Asset Movement", movement.name)
        doc.cancel()
        frappe.db.commit()

    # Cancel linked Journal Entries referencing this asset
    je_accounts = frappe.db.sql(
        """SELECT DISTINCT parent FROM `tabJournal Entry Account`
           WHERE reference_type = 'Asset' AND reference_name = %s""",
        asset_name,
        as_dict=True,
    )
    for row in je_accounts:
        je_docstatus = frappe.db.get_value("Journal Entry", row.parent, "docstatus")
        if je_docstatus == 1:
            doc = frappe.get_doc("Journal Entry", row.parent)
            doc.cancel()
            frappe.db.commit()


@frappe.whitelist()
def bulk_delete_assets(asset_names):
    if isinstance(asset_names, str):
        asset_names = frappe.parse_json(asset_names)

    if not asset_names:
        frappe.throw(_("No assets selected"))

    deleted = 0
    failed = []
    errors = {}

    for name in asset_names:
        try:
            docstatus = frappe.db.get_value("Asset", name, "docstatus")
            if docstatus == 1:
                cancel_linked_docs(name)
                frappe.db.sql("UPDATE `tabAsset` SET status='Submitted' WHERE name=%s", name)
                frappe.db.commit()
                frappe.get_doc("Asset", name).cancel()
                frappe.db.commit()
            frappe.delete_doc("Asset", name, force=True, ignore_permissions=True)
            frappe.db.commit()
            deleted += 1
        except Exception as e:
            frappe.db.rollback()
            failed.append(name)
            errors[name] = str(e)

    return {"deleted": deleted, "failed": failed, "errors": errors}


@frappe.whitelist()
def bulk_update_assets(asset_names, location):
    if isinstance(asset_names, str):
        asset_names = frappe.parse_json(asset_names)

    if not asset_names:
        frappe.throw(_("No assets selected"))

    if not location:
        frappe.throw(_("Location is required"))

    branch_name = frappe.db.get_value("Sahayog Branch", location, "branch")

    updated = 0
    failed = []
    errors = {}

    for name in asset_names:
        try:
            frappe.db.sql(
                "UPDATE `tabAsset` SET location=%s, branch_name=%s WHERE name=%s",
                (location, branch_name, name),
            )
            frappe.db.commit()
            updated += 1
        except Exception as e:
            frappe.db.rollback()
            failed.append(name)
            errors[name] = str(e)

    return {"updated": updated, "failed": failed, "errors": errors}


@frappe.whitelist()
def update_emr_fields(name, target_warehouse=None, source_warehouse=None, required_by_date=None):
    updates = []
    values = []
    if target_warehouse is not None:
        updates.append("target_warehouse=%s")
        values.append(target_warehouse)
    if source_warehouse is not None:
        updates.append("source_warehouse=%s")
        values.append(source_warehouse)
    if required_by_date is not None:
        updates.append("required_by_date=%s")
        values.append(required_by_date)

    if not updates:
        frappe.throw(_("No fields to update"))

    values.append(name)
    frappe.db.sql(
        f"UPDATE `tabEmployee Material Request` SET {', '.join(updates)} WHERE name=%s",
        values,
    )
    frappe.db.commit()
    return {"success": True}


@frappe.whitelist()
def create_asset_with_name(doc, custom_name=None):
    if isinstance(doc, str):
        doc = frappe.parse_json(doc)

    if not doc.get("doctype"):
        frappe.throw(_("Invalid document"))

    new_doc = frappe.get_doc(doc)
    new_doc.insert()

    if custom_name and new_doc.name != custom_name:
        frappe.rename_doc("Asset", new_doc.name, custom_name, force=True)
        new_doc.name = custom_name

    return {"name": new_doc.name}


def _read_file_content(file_url):
    """Read file content from a file URL."""
    file_name = file_url.split("/")[-1]
    private_path = frappe.get_site_path("private", "files", file_name)
    public_path = frappe.get_site_path("public", "files", file_name)
    if os.path.exists(private_path):
        file_path = private_path
    elif os.path.exists(public_path):
        file_path = public_path
    else:
        frappe.throw(f"File not found: {file_url}")

    # If Excel file, read with openpyxl
    if file_name.lower().endswith(('.xlsx', '.xls')):
        import openpyxl
        wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
        if not rows:
            return ""
        import io, csv
        output = io.StringIO()
        writer = csv.writer(output)
        for row in rows:
            writer.writerow([str(cell) if cell is not None else "" for cell in row])
        return output.getvalue()

    # For CSV, try UTF-8 first, then latin-1
    for encoding in ['utf-8', 'latin-1', 'cp1252']:
        try:
            with open(file_path, "r", encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    frappe.throw(f"Could not read file with any supported encoding: {file_name}")


def _parse_csv(file_content):
    """Parse CSV content and return list of dicts."""
    reader = csv.DictReader(io.StringIO(file_content))
    return [row for row in reader]


@frappe.whitelist()
def bulk_insert_assets(file_url):
    """Insert assets from a CSV/Excel file.
    
    Expected columns: name, item_code, custom_invoice_number, brand, serial_no,
    Zone, State, Location, Division, gross_purchase_amount, available_for_use_date, purchase_date
    """
    if not file_url:
        frappe.throw(_("No file provided"))

    content = _read_file_content(file_url)
    rows = _parse_csv(content)

    if not rows:
        frappe.throw(_("No data found in file"))

    inserted = 0
    failed = []
    errors = {}

    for i, row in enumerate(rows):
        try:
            asset_name = row.get("name", "").strip()
            if not asset_name:
                failed.append(f"Row {i+1}")
                errors[f"Row {i+1}"] = "Missing name"
                continue

            if frappe.db.exists("Asset", asset_name):
                failed.append(asset_name)
                errors[asset_name] = "Asset already exists"
                continue

            doc_data = {
                "doctype": "Asset",
                "asset_name": asset_name,
                "item_code": row.get("item_code", "").strip(),
                "custom_invoice_number": row.get("custom_invoice_number", "").strip() or None,
                "brand": row.get("brand", "").strip() or None,
                "serial_no": row.get("serial_no", "").strip() or None,
                "zone": row.get("Zone", "").strip() or None,
                "state": row.get("State", "").strip() or None,
                "location": row.get("Location", "").strip() or None,
                "division": row.get("Division", "").strip() or None,
                "gross_purchase_amount": row.get("gross_purchase_amount", "").strip() or None,
                "available_for_use_date": row.get("available_for_use_date", "").strip() or None,
                "purchase_date": row.get("purchase_date", "").strip() or None,
                "company": frappe.defaults.get_global_default("company"),
            }

            doc = frappe.get_doc(doc_data)
            doc.insert(ignore_permissions=True)
            frappe.db.commit()
            inserted += 1
        except Exception as e:
            frappe.db.rollback()
            failed.append(row.get("name", f"Row {i+1}"))
            errors[row.get("name", f"Row {i+1}")] = str(e)

    return {"inserted": inserted, "failed": failed, "errors": errors}


@frappe.whitelist()
def bulk_update_assets_from_file(file_url):
    """Update assets from a CSV/Excel file.
    
    Required column: name (Asset ID)
    Optional columns: item_code, custom_invoice_number, brand, serial_no,
    Zone, State, Location, Division, gross_purchase_amount, available_for_use_date, purchase_date
    """
    if not file_url:
        frappe.throw(_("No file provided"))

    content = _read_file_content(file_url)
    rows = _parse_csv(content)

    if not rows:
        frappe.throw(_("No data found in file"))

    updated = 0
    failed = []
    errors = {}

    for i, row in enumerate(rows):
        try:
            asset_name = row.get("name", "").strip()
            if not asset_name:
                failed.append(f"Row {i+1}")
                errors[f"Row {i+1}"] = "Missing name"
                continue

            if not frappe.db.exists("Asset", asset_name):
                failed.append(asset_name)
                errors[asset_name] = "Asset does not exist"
                continue

            field_map = {
                "item_code": "item_code",
                "custom_invoice_number": "custom_invoice_number",
                "brand": "brand",
                "serial_no": "serial_no",
                "Zone": "zone",
                "State": "state",
                "Location": "location",
                "Division": "division",
                "gross_purchase_amount": "gross_purchase_amount",
                "available_for_use_date": "available_for_use_date",
                "purchase_date": "purchase_date",
            }

            update_fields = {}
            for csv_col, db_field in field_map.items():
                val = row.get(csv_col, "").strip()
                if val:
                    update_fields[db_field] = val

            if update_fields:
                set_clause = ", ".join([f"{k}=%s" for k in update_fields.keys()])
                values = list(update_fields.values()) + [asset_name]
                frappe.db.sql(f"UPDATE `tabAsset` SET {set_clause} WHERE name=%s", values)
                frappe.db.commit()
                updated += 1
        except Exception as e:
            frappe.db.rollback()
            failed.append(row.get("name", f"Row {i+1}"))
            errors[row.get("name", f"Row {i+1}")] = str(e)

    return {"updated": updated, "failed": failed, "errors": errors}
