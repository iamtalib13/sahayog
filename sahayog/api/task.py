import frappe
import json

@frappe.whitelist()
def update_location_details(parent_docname, location_name, new_values_json):
    """
    Updates all child table rows matching a location name and returns a simple success message.
    """
    try:
        doc = frappe.get_doc("Task", parent_docname)
        new_values = json.loads(new_values_json)

        numeric_fields = ["rent_per_month", "security_deposit", "municipal_taxes", "maintenance"]
        changes_made = False

        for row in doc.get("custom_location_details"):
            if row.location_name == location_name:
                for fieldname, new_value in new_values.items():
                    if hasattr(row, fieldname):
                        current_value = row.get(fieldname)

                        norm_current = normalize_value(current_value, fieldname, numeric_fields)
                        norm_new = normalize_value(new_value, fieldname, numeric_fields)

                        if norm_current != norm_new:
                            row.set(fieldname, new_value)
                            changes_made = True

        if changes_made:
            doc.save(ignore_permissions=True)
            frappe.db.commit()
            frappe.logger().info(f"Location details updated for {location_name}")
            return "Successfully updated."
        else:
            return "No changes detected."

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "update_location_details Error")
        return {"error": str(e)}


def normalize_value(value, fieldname, numeric_fields):
    if fieldname in numeric_fields:
        try:
            return round(float(value or 0), 2)
        except (ValueError, TypeError):
            return 0.0
    else:
        if value is None:
            return ''
        if isinstance(value, str):
            return value.strip()
        return value
