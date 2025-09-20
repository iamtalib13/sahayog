import frappe

def set_ignore_user_permissions():
    """
    This function sets the 'ignore_user_permissions' property
    to True for the specified fields in the Lead DocType using Property Setter.
    """
    fields = ["owner", "source", "gender"]
    
    for fieldname in fields:
        # Check if the property setter already exists
        exists = frappe.db.exists("Property Setter", {
            "doc_type": "Lead",
            "field_name": fieldname,
            "property": "ignore_user_permissions"
        })
        
        if not exists:
            ps = frappe.get_doc({
                "doctype": "Property Setter",
                "doc_type": "Lead",
                "doctype_or_field": "DocField",
                "field_name": fieldname,
                "property": "ignore_user_permissions",
                "property_type": "Check",
                "value": 1,
                "apply_to": "Field"
            })
            ps.insert(ignore_permissions=True)
            frappe.db.commit()
            print(f"Property Setter created for field: {fieldname}")
        else:
            print(f"Property Setter already exists for field: {fieldname}")

# This is what Frappe calls automatically
def execute():
    set_ignore_user_permissions()


