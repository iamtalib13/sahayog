import frappe


CUSTOM_ASSET_STATUS_OPTIONS = "Draft\nAvailable\nAssigned\nIn Repair\nScrapped\nSubmitted\nCancelled"


def create_or_update_property_setter(doc_type, field_name, property_name, value, property_type, module="Procurement"):
    filters = {
        "doc_type": doc_type,
        "field_name": field_name,
        "property": property_name,
    }

    if not frappe.db.exists("Property Setter", filters):
        frappe.get_doc({
            "doctype": "Property Setter",
            "doctype_or_field": "DocField",
            "doc_type": doc_type,
            "field_name": field_name,
            "property": property_name,
            "value": value,
            "property_type": property_type,
            "module": module,
        }).insert(ignore_permissions=True)
        return

    doc = frappe.get_doc("Property Setter", filters)
    if doc.value != value or doc.property_type != property_type or doc.module != module:
        doc.value = value
        doc.property_type = property_type
        doc.module = module
        doc.save(ignore_permissions=True)


def execute():
    create_or_update_property_setter("Asset", "status", "options", CUSTOM_ASSET_STATUS_OPTIONS, "Text")
    create_or_update_property_setter("Asset", "status", "default", "Draft", "Data")
