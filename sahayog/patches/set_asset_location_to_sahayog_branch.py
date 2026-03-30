import frappe

def execute():
    # 1. Update Asset location field options to Sahayog Branch
    create_property_setter("Asset", "location", "options", "Sahayog Branch", "Text")
    
    # 2. Update Asset Movement Item location fields to Sahayog Branch
    create_property_setter("Asset Movement Item", "source_location", "options", "Sahayog Branch", "Text")
    create_property_setter("Asset Movement Item", "target_location", "options", "Sahayog Branch", "Text")
    
    # 3. Add Custom Field to fetch Branch Name in Asset
    if not frappe.db.exists("Custom Field", "Asset-branch_name"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Asset",
            "fieldname": "branch_name",
            "label": "Branch Name",
            "fieldtype": "Read Only",
            "insert_after": "location",
            "fetch_from": "location.branch",
            "in_list_view": 1,
            "module": "Procurement"
        }).insert(ignore_permissions=True)
    
    frappe.db.commit()

def create_property_setter(doc_type, field_name, property_name, value, property_type):
    filters = {
        "doc_type": doc_type,
        "field_name": field_name,
        "property": property_name
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
            "module": "Procurement"
        }).insert(ignore_permissions=True)
    else:
        # Update existing property setter if it exists but has different value
        ps = frappe.get_doc("Property Setter", filters)
        if ps.value != value:
            ps.value = value
            ps.module = "Procurement"
            ps.save(ignore_permissions=True)
