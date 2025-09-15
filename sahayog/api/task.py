import frappe
import json
from frappe.utils import today


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
    

@frappe.whitelist()
def allocate_suppliers_and_create_mr(project_name, supplier, product_bundle):
    # Check if MR already exists with same project, supplier, and product bundle
    existing_mr = frappe.get_all(
        "Material Request",
        filters={
            "custom_project": project_name,
            "custom_supplier": supplier,
            "custom_product_bundle": product_bundle,
        },
        fields=["name"]
    )

    if existing_mr:
        return {
            "status": "exists",
            "message": f"Material Request {existing_mr[0].name} already exists for this Supplier & Product Bundle."
        }

    project = frappe.get_doc("Project", project_name)

    # Create Material Request
    mr = frappe.new_doc("Material Request")
    mr.update({
        "material_request_type": "Purchase",
        "project": project_name,
        "status": "Draft",
        "custom_product_bundle": product_bundle,
        "custom_request_for": "Project",
        "custom_project": project_name,
        "set_warehouse": project.custom_project_warehouse or "",
        "schedule_date": today(),
        "custom_supplier": supplier
    })

    # Add items from Product Bundle
    bundle = frappe.get_doc("Product Bundle", product_bundle)
    for item in bundle.items:
        mr.append("items", {
            "item_code": item.item_code,
            "qty": item.qty,
            "uom": item.uom,
            "required_by": today(),
            "description": item.item_code or "",
            "uom_conversion_factor": 1,
        })

    mr.insert()
    frappe.db.commit()

    return {
        "status": "created",
        "message": f"Material Request {mr.name} created successfully!",
        "mr_name": mr.name
    }
