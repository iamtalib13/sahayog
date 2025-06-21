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


def execute():
    doc_type = "Item"
  

    try:
        # item_code: depends_on = eval:!doc.__islocal
        create_property_setter(
            doc_type=doc_type,
            field_name="item_code",
            property_name="depends_on",
            value="eval:!doc.__islocal",
            property_type="Code",
           
        )

        # item_code: reqd = 0
        create_property_setter(
            doc_type=doc_type,
            field_name="item_code",
            property_name="reqd",
            value="0",
            property_type="Check",
        
        )

        # item_name: reqd = 1
        create_property_setter(
            doc_type=doc_type,
            field_name="item_name",
            property_name="reqd",
            value="1",
            property_type="Check",
          
        )


    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Property Setter Patch: Item")
