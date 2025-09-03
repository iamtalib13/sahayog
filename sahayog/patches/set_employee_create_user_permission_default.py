import frappe

def execute():
    """Set create_user_permission field default value to 0 for Employee DocType"""
    
    # Check if Property Setter already exists
    existing_property = frappe.db.exists("Property Setter", {
        "doctype_or_field": "DocField",
        "doc_type": "Employee",
        "field_name": "create_user_permission",
        "property": "default"
    })
    
    if not existing_property:
        # Create Property Setter to set default value to 0
        property_setter = frappe.get_doc({
            "doctype": "Property Setter",
            "doctype_or_field": "DocField",
            "doc_type": "Employee",
            "field_name": "create_user_permission",
            "property": "default",
            "value": "0",
            "property_type": "Check"
        })
        property_setter.insert(ignore_permissions=True)
        frappe.db.commit()
        
        print("Property Setter created: Employee create_user_permission default set to 0")
    else:
        # Update existing Property Setter
        property_doc = frappe.get_doc("Property Setter", existing_property)
        property_doc.value = "0"
        property_doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        print("Property Setter updated: Employee create_user_permission default set to 0")
