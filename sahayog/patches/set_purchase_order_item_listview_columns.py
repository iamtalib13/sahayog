import frappe
import json

def execute():
    doctype = "Purchase Order Item"
    print(f"\n🔧 Starting patch for: {doctype}")

    # Field widths (unchanged)
    fields_config = {
        "item_code": 2,
        "schedule_date": 2,   # Required By
        "qty": 1,
        "rate": 2,
        "base_amount": 2,     # Amount
        "item_tax_template": 1
    }

    # ✅ Correct field order (Rate before Amount, Item Tax Template last)
    required_fieldnames = [
        "item_code",
        "schedule_date",
        "qty",
        "rate",
        "base_amount",
        "item_tax_template"
    ]

    # ---------------------------
    # Clean old idx property setters
    # ---------------------------
    for field in ["item_code", "schedule_date", "qty", "rate", "base_amount", "item_tax_template"]:
        frappe.db.delete("Property Setter", {
            "doc_type": doctype,
            "field_name": field,
            "property": "idx"
        })
    print("🧹 Cleared old idx Property Setters.")

    # Fetch metadata for the doctype
    meta = frappe.get_meta(doctype)

    for df in meta.fields:
        if not df.fieldname:
            continue

        fieldname = df.fieldname
        should_be_visible = fieldname in fields_config

        # ---------------------------
        # 1. Set in_list_view
        # ---------------------------
        existing_in_list = frappe.db.exists("Property Setter", {
            "doc_type": doctype,
            "property": "in_list_view",
            "field_name": fieldname
        })

        if should_be_visible:
            if existing_in_list:
                doc = frappe.get_doc("Property Setter", existing_in_list)
                if doc.value != "1":
                    doc.value = "1"
                    doc.save(ignore_permissions=True)
                    print(f"🔁 Updated in_list_view to 1: {fieldname}")
            else:
                frappe.get_doc({
                    "doctype": "Property Setter",
                    "doc_type": doctype,
                    "field_name": fieldname,
                    "property": "in_list_view",
                    "value": "1",
                    "property_type": "Check",
                    "doctype_or_field": "DocField"
                }).insert(ignore_permissions=True)
                print(f"✅ Created in_list_view = 1 for: {fieldname}")
        else:
            if df.in_list_view:
                if existing_in_list:
                    doc = frappe.get_doc("Property Setter", existing_in_list)
                    if doc.value != "0":
                        doc.value = "0"
                        doc.save(ignore_permissions=True)
                        print(f"🔁 Updated in_list_view to 0: {fieldname}")
                else:
                    frappe.get_doc({
                        "doctype": "Property Setter",
                        "doc_type": doctype,
                        "field_name": fieldname,
                        "property": "in_list_view",
                        "value": "0",
                        "property_type": "Check",
                        "doctype_or_field": "DocField"
                    }).insert(ignore_permissions=True)
                    print(f"➕ Created in_list_view = 0 for: {fieldname}")

        # ---------------------------
        # 2. Set columns width
        # ---------------------------
        if should_be_visible:
            width = str(fields_config[fieldname])
            existing_column = frappe.db.exists("Property Setter", {
                "doc_type": doctype,
                "property": "columns",
                "field_name": fieldname
            })

            if existing_column:
                doc = frappe.get_doc("Property Setter", existing_column)
                if doc.value != width:
                    doc.value = width
                    doc.save(ignore_permissions=True)
                    print(f"🔁 Updated columns for {fieldname}: {width}")
            else:
                frappe.get_doc({
                    "doctype": "Property Setter",
                    "doc_type": doctype,
                    "field_name": fieldname,
                    "property": "columns",
                    "value": width,
                    "property_type": "Int",
                    "doctype_or_field": "DocField"
                }).insert(ignore_permissions=True)
                print(f"➕ Created columns for {fieldname}: {width}")

        # ---------------------------
        # 3. Set idx to control order
        # ---------------------------
        if should_be_visible:
            desired_idx = required_fieldnames.index(fieldname) + 1
            existing_idx = frappe.db.exists("Property Setter", {
                "doc_type": doctype,
                "property": "idx",
                "field_name": fieldname
            })

            if existing_idx:
                doc = frappe.get_doc("Property Setter", existing_idx)
                if doc.value != str(desired_idx):
                    doc.value = str(desired_idx)
                    doc.save(ignore_permissions=True)
                    print(f"🔁 Updated idx for {fieldname}: {desired_idx}")
            else:
                frappe.get_doc({
                    "doctype": "Property Setter",
                    "doc_type": doctype,
                    "field_name": fieldname,
                    "property": "idx",
                    "value": str(desired_idx),
                    "property_type": "Int",
                    "doctype_or_field": "DocField"
                }).insert(ignore_permissions=True)
                print(f"✅ Set idx for {fieldname}: {desired_idx}")

    # Clear cache after patch execution
    frappe.clear_cache(doctype=doctype)
    print("✅ Patch execution completed.\n")
