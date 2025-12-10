import frappe


def execute():

    # ---------------------------------------------------------
    # 1️⃣ Custom Fields for Stock Entry  (Safe Creation)
    # ---------------------------------------------------------
    stock_entry_fields = {
        "custom_material_request_doctype": {
            "label": "Material Request DocType",
            "fieldtype": "Data",
            "insert_after": "stock_entry_type",
            "read_only": 1,
        }
    }

    for fieldname, df in stock_entry_fields.items():
        custom_field_id = f"Stock Entry-{fieldname}"

        if not frappe.db.exists("Custom Field", custom_field_id):
            frappe.get_doc(
                {
                    "doctype": "Custom Field",
                    "dt": "Stock Entry",
                    "fieldname": fieldname,
                    **df,
                }
            ).insert()
            print("Created:", custom_field_id)
        else:
            print("Already exists:", custom_field_id)

    frappe.db.commit()
    print("\nAll custom fields processed successfully.")
