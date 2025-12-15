import frappe
from frappe import _
import re

# =====================================================
# COMMON API RESPONSE HELPERS
# =====================================================

def api_success(message, data=None):
    return {
        "status": "success",
        "message": message,
        "data": data or {}
    }


def api_error(message, error_code="VALIDATION_ERROR", http_status=400):
    frappe.local.response.http_status_code = http_status
    return {
        "status": "error",
        "message": message,
        "error_code": error_code
    }


# =====================================================
# VALIDATIONS
# =====================================================

def validate_zone_region(zone=None, region=None):
    zone_pattern = r"^Zone-\d+$"
    region_pattern = r"^Region-\d+$"

    if zone and not re.match(zone_pattern, zone):
        return api_error(
            "zone must be in format zone-<number> (e.g. Zone-1)",
            "INVALID_ZONE_FORMAT"
        )

    if region and not re.match(region_pattern, region):
        return api_error(
            "region must be in format region-<number> (e.g. Region-1)",
            "INVALID_REGION_FORMAT"
        )

    return None


# =====================================================
# ADD BRANCH
# =====================================================

@frappe.whitelist()
def add_branch():
    try:
        data = frappe.form_dict

        required_fields = [
            "sol_id", "branch", "district",
            "region", "zone", "state", "state_code"
        ]

        for field in required_fields:
            if not data.get(field):
                return api_error(f"{field} is required")

        # Validate zone & region format
        validation_error = validate_zone_region(
            data.get("zone"),
            data.get("region")
        )
        if validation_error:
            return validation_error

        # Duplicate sol_id check
        if frappe.db.exists("Sahayog Branch", {"sol_id": data.get("sol_id")}):
            return api_error(
                "Branch with same sol_id already exists",
                "DUPLICATE_SOL_ID",
                409
            )

        doc = frappe.get_doc({
            "doctype": "Sahayog Branch",
            "sol_id": data.get("sol_id"),
            "branch": data.get("branch"),
            "district": data.get("district"),
            "region": data.get("region"),
            "zone": data.get("zone"),
            "state": data.get("state"),
            "state_code": data.get("state_code"),
            "email": data.get("email")
        })

        doc.insert(ignore_permissions=False)
        frappe.db.commit()

        return api_success(
            "Branch created successfully",
            {"branch_id": doc.name}
        )

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Add Branch API Error")
        return api_error(
            "Internal server error",
            "INTERNAL_ERROR",
            500
        )


# =====================================================
# UPDATE BRANCH
# =====================================================

@frappe.whitelist()
def update_branch():
    try:
        data = frappe.form_dict
        branch_id = data.get("branch_id")

        if not branch_id:
            return api_error("branch_id is required")

        if not frappe.db.exists("Sahayog Branch", branch_id):
            return api_error(
                "Branch not found",
                "NOT_FOUND",
                404
            )

        # Validate zone & region (only if provided)
        validation_error = validate_zone_region(
            data.get("zone"),
            data.get("region")
        )
        if validation_error:
            return validation_error

        doc = frappe.get_doc("Sahayog Branch", branch_id)

        allowed_fields = [
            "sol_id", "branch", "district",
            "region", "zone", "state",
            "state_code", "email"
        ]

        for field in allowed_fields:
            if field in data:
                setattr(doc, field, data.get(field))

        doc.save(ignore_permissions=False)
        frappe.db.commit()

        return api_success("Branch updated successfully")

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Update Branch API Error")
        return api_error(
            "Internal server error",
            "INTERNAL_ERROR",
            500
        )


# =====================================================
# GET BRANCH LIST
# =====================================================

@frappe.whitelist()
def get_branch_list():
    data = frappe.form_dict

    filters = {}

    if data.get("zone"):
        filters["zone"] = data.get("zone")

    if data.get("region"):
        filters["region"] = data.get("region")

    if data.get("state"):
        filters["state"] = data.get("state")

    records = frappe.get_all(
        "Sahayog Branch",
        filters=filters,
        fields=[
            "name",
            "sol_id",
            "branch",
            "district",
            "region",
            "zone",
            "state",
            "state_code",
            "email"
        ],
        order_by="modified desc"
    )

    return {
        "status": "success",
        "message": "Branch list fetched successfully",
        "data": {
            "records": records,
            "total_records": len(records)
        }
    }
