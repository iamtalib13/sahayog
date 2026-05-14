import frappe

def execute():
    # Define the custom field
    custom_field = {
        "dt": "Purchase Receipt",
        "fieldname": "existing_stock_date",
        "label": "Existing Stock Date",
        "fieldtype": "Date",
        "insert_after": "posting_time",
        "print_hide": 0,
    }

    # Create the custom field
    frappe.get_doc({
        "doctype": "Custom Field",
        **custom_field
    }).insert(ignore_permissions=True)

    frappe.db.commit()
    frappe.clear_cache()
