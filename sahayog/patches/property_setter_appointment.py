import frappe

def create_property_setter(doc_type, field_name, property_name, value, property_type):
    if not frappe.db.exists("Property Setter", {
        "doc_type": doc_type,
        "field_name": field_name,
        "property": property_name
    }):
        frappe.get_doc({
            "doctype": "Property Setter",
            "doctype_or_field": "DocField",
            "doc_type": doc_type,
            "field_name": field_name,
            "property": property_name,
            "value": value,
            "property_type": property_type,
            
        }).insert(ignore_permissions=True)
    else:
        # Agar already exist karta hai to value update kar do
        frappe.db.set_value(
            "Property Setter",
            {
                "doc_type": doc_type,
                "field_name": field_name,
                "property": property_name
            },
            "value",
            value
        )


def execute():
    doc_type = "Appointment"

    try:
        # customer_email: reqd = 0 (mandatory remove)
        create_property_setter(
            doc_type=doc_type,
            field_name="customer_email",
            property_name="reqd",
            value="0",
            property_type="Check",
        )

        frappe.clear_cache(doctype="Appointment")

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Property Setter Patch: Appointment"
        )
