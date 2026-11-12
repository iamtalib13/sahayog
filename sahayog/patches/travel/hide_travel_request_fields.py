import frappe

# Fields from the stock HRMS Travel Request that are not needed for the
# lightweight Sahayog flow. Hiding them keeps the Desk form simple.
HIDDEN_FIELDS = (
    "travel_funding",
    "travel_proof",
    "column_break_2",
    "details_of_sponsor",
    "cell_number",
    "prefered_email",
    "date_of_birth",
    "personal_id_type",
    "personal_id_number",
    "passport_number",
    "column_break_7",
    "travel_itinerary",
    "itinerary",
    "costing_details",
    "costings",
    "accounting_dimensions_section",
    "cost_center",
    "dimension_col_break",
    "event_details",
    "name_of_organizer",
    "address_of_organizer",
    "other_details",
    "amended_from",
)


def _set_property(doctype, fieldname, property_name, value, property_type):
    name = f"{doctype}-{fieldname}-{property_name}"
    existing = frappe.db.exists("Property Setter", name)
    if existing:
        frappe.db.set_value(
            "Property Setter",
            name,
            {"value": value, "property_type": property_type},
        )
    else:
        frappe.get_doc(
            {
                "doctype": "Property Setter",
                "name": name,
                "doctype_or_field": "DocField",
                "doc_type": doctype,
                "field_name": fieldname,
                "property": property_name,
                "value": value,
                "property_type": property_type,
            }
        ).insert(ignore_permissions=True)


def execute():
    for fieldname in HIDDEN_FIELDS:
        _set_property("Travel Request", fieldname, "hidden", "1", "Check")

    # Employee section is collapsible in stock HRMS; keep it open so the
    # employee details are visible without an extra click.
    _set_property("Travel Request", "employee_details", "collapsible", "0", "Check")

    # Sensible defaults for the lightweight flow.
    _set_property("Travel Request", "travel_type", "default", "Domestic", "Data")

    frappe.clear_cache(doctype="Travel Request")
