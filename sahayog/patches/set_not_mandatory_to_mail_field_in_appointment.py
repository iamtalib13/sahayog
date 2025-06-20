import frappe

def execute():
    doc_type = "Appointment"
    field_name = "customer_email"
    module_name = "SCRM"

    try:
        # Check if property setter already exists
        if not frappe.db.exists("Property Setter", {
            "doc_type": doc_type,
            "field_name": field_name,
            "property": "reqd"
        }):
            frappe.get_doc({
                "doctype": "Property Setter",
                "name": f"{doc_type}-{field_name}-reqd",
                "doctype_or_field": "DocField",
                "doc_type": doc_type,
                "field_name": field_name,
                "property": "reqd",
                "value": 0,                      # Not required
                "property_type": "Check",
                "module": module_name
            }).insert(ignore_permissions=True)

            frappe.db.commit()
            print("✅ Property Setter created successfully.")
        else:
            print("ℹ️ Property Setter already exists.")

    except Exception as e:
        frappe.log_error(title="Failed to create Property Setter for customer_email", message=frappe.get_traceback())
        print(f"❌ Error: {e}")
