import frappe

def execute():
    doc_type = "Opportunity"
    module_name = "SCRM"

    try:
        if not frappe.db.exists("Property Setter", {
            "doc_type": doc_type,
            "property": "quick_entry"
        }):
            frappe.get_doc({
                "doctype": "Property Setter",
                "doctype_or_field": "DocType",
                "doc_type": doc_type,
                "property": "quick_entry",
                "property_type": "Check",
                "value": 1,
                "module": module_name,
                "name": f"{doc_type}-quick_entry",
            }).insert(ignore_permissions=True)

            frappe.clear_cache(doctype=doc_type)
            print("Quick Entry enabled for Opportunity")

    except Exception as e:
        frappe.log_error(message=frappe.get_traceback(), title="Failed to enable Quick Entry for Opportunity")
        print(f"Error creating property setter: {e}")
