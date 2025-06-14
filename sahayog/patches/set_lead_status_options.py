import frappe

def execute():
    field_name = "status"
    doc_type = "Lead"
    module_name = "SCRM"

    # List of custom options
    options = "\n".join([
        "Lead",
        "Converted",
        "Follow Up",
        "Not Interested",
    ])

    try:
        # Insert Property Setter for options
        if not frappe.db.exists("Property Setter", {
            "doc_type": doc_type,
            "field_name": field_name,
            "property": "options"
        }):
            frappe.get_doc({
                "doctype": "Property Setter",
                "name": f"{doc_type}-{field_name}-options",
                "doctype_or_field": "DocField",
                "doc_type": doc_type,
                "field_name": field_name,
                "property": "options",
                "value": options,
                "property_type": "Text",  # Required
                "module": module_name
            }).insert(ignore_permissions=True)

    except Exception as e:
        frappe.log_error(message=frappe.get_traceback(), title="Failed to set Lead status options")
        print(f"Error creating property setter: {e}")
