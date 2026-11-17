import frappe


def execute():
    """Keep User Permission restrictions from hiding travel requests.

    Employees have a User Permission on their own Employee record. Frappe
    validates every Link field against User Permissions, so:
      - `reporting_manager` (another Employee) blocks the request itself
      - `employee` (the requester) blocks managers/HR from opening a request

    The Employee role uses `if_owner`, so bypassing User Permissions on these
    two links does not expose anyone else's requests.
    """
    if frappe.db.exists("Custom Field", {"dt": "Travel Request", "fieldname": "reporting_manager"}):
        frappe.db.set_value(
            "Custom Field",
            {"dt": "Travel Request", "fieldname": "reporting_manager"},
            "ignore_user_permissions",
            1,
        )

    name = "Travel Request-employee-ignore_user_permissions"
    if frappe.db.exists("Property Setter", name):
        frappe.db.set_value("Property Setter", name, "value", "1")
    else:
        frappe.get_doc(
            {
                "doctype": "Property Setter",
                "name": name,
                "doctype_or_field": "DocField",
                "doc_type": "Travel Request",
                "field_name": "employee",
                "property": "ignore_user_permissions",
                "value": "1",
                "property_type": "Check",
            }
        ).insert(ignore_permissions=True)

    frappe.clear_cache(doctype="Travel Request")
