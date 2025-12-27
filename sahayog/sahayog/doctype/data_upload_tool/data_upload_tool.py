# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import pandas as pd
import frappe
from frappe.model.document import Document


class DataUploadTool(Document):
	pass



@frappe.whitelist()
def start_data_import(upload_doc):
    """
    Generic Data Import Tool with robust error handling.
    Supports .xlsx, .xlsb, and .csv files.
    Logs row-level errors and continues import.
    """
    doc = frappe.get_doc("Data Upload Tool", upload_doc)

    target_doctype = doc.doctype_name
    upload_type = doc.upload_type
    file_url = doc.upload_file
    child_table_field = getattr(doc, "child_table_field", None)

    if not file_url:
        frappe.throw("Please upload a file")

    file_path = frappe.get_site_path(file_url.lstrip("/"))

    # ---------------- Load File ----------------
    try:
        if file_path.endswith(".xlsb"):
            df = pd.read_excel(file_path, engine='pyxlsb')
        elif file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
    except Exception as e:
        frappe.throw(f"Failed to read file: {str(e)}")

    if "sol_id" not in df.columns:
        frappe.throw("Excel/CSV must contain 'sol_id' column")

    created, updated, skipped = 0, 0, 0

    # ---------------- Process Rows ----------------
    for i, row in df.iterrows():
        try:
            sol_id = row.get("sol_id")
            if not sol_id:
                skipped += 1
                continue

            exists = frappe.db.exists(target_doctype, {"sol_id": sol_id})

            # ---------------- INSERT ----------------
            if upload_type == "Insert New Records" and not exists:
                new_doc = frappe.new_doc(target_doctype)
                new_doc.sol_id = sol_id
                map_row_to_doc(new_doc, row, child_table_field)
                new_doc.insert(ignore_permissions=True)
                created += 1

            # ---------------- UPDATE ----------------
            elif upload_type == "Update Existing Records" and exists:
                existing_doc = frappe.get_doc(target_doctype, exists)
                map_row_to_doc(existing_doc, row, child_table_field)
                existing_doc.save(ignore_permissions=True)
                updated += 1

            # If neither insert nor update applicable, skip
            else:
                skipped += 1

        except Exception as e:
            frappe.log_error(message=str(e), title=f"Data Import Error - Row {i + 2}")
            skipped += 1

    frappe.db.commit()

    return f"""
    <b>Upload Completed</b><br>
    Created: {created}<br>
    Updated: {updated}<br>
    Skipped/Errors: {skipped}
    """


def map_row_to_doc(doc, row, child_table_field=None):
    """
    Map Excel/CSV row to DocType fields.
    Unmapped columns can go into a child table as key/value.
    """
    skip_fields = {"sol_id"}

    if child_table_field:
        if not hasattr(doc, child_table_field):
            frappe.throw(f"Child table '{child_table_field}' not found in {doc.doctype}")
        if doc.is_new():
            doc.set(child_table_field, [])

    for column, value in row.items():
        if column in skip_fields or pd.isna(value):
            continue

        # Map to DocType field if exists
        if column in doc.meta.fields_map:
            fieldtype = doc.meta.get_field(column).fieldtype
            doc.set(column, convert_value(fieldtype, value))
        # Else map to child table
        elif child_table_field:
            doc.append(child_table_field, {
                "key": column,
                "value": convert_value("Data", value)
            })


def convert_value(fieldtype, value):
    """Convert value based on field type."""
    if pd.isna(value):
        return None

    try:
        if fieldtype in ("Int", "Float", "Currency"):
            return float(value) if '.' in str(value) else int(value)
        if fieldtype == "Check":
            return 1 if str(value).lower() in ("1", "true", "yes") else 0
        if fieldtype == "Date":
            if isinstance(value, pd.Timestamp):
                return value.date()
            return str(value)
    except Exception:
        # fallback to original value if conversion fails
        return value

    return value