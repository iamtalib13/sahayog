import frappe
from frappe import _
from frappe.utils import now_datetime


ALLOWED_STATUS_FLOW = {
    "assign": {"to_status": "Assigned", "allowed_from": {"", "Draft", "Submitted", "Available", "In Repair", "Scrapped"}, "purpose": "Receipt"},
    "transfer": {"to_status": "Assigned", "allowed_from": {"Assigned"}, "purpose": "Transfer"},
    "return": {"to_status": "Available", "allowed_from": {"Assigned"}, "purpose": "Transfer"},
    "send_for_repair": {"to_status": "In Repair", "allowed_from": {"", "Draft", "Submitted", "Available", "Assigned", "In Repair"}, "purpose": "Transfer"},
    "mark_available": {"to_status": "Available", "allowed_from": {"In Repair", "Scrapped"}, "purpose": "Transfer"},
    "scrap": {"to_status": "Scrapped", "allowed_from": {"", "Draft", "Submitted", "Available", "Assigned", "In Repair"}, "purpose": "Transfer"},
    "restore_to_previous": {"to_status": "Assigned", "allowed_from": {"Scrapped"}, "purpose": "Transfer"},
}


@frappe.whitelist()
def get_previous_custodian(asset_name):
    # Find the last movement item where a custodian was assigned
    last_movement = frappe.db.sql("""
        SELECT item.to_employee, item.target_location
        FROM `tabAsset Movement Item` item
        JOIN `tabAsset Movement` main ON item.parent = main.name
        WHERE item.asset = %s AND main.docstatus = 1 AND item.to_employee != ''
        ORDER BY main.transaction_date DESC, main.creation DESC
        LIMIT 1
    """, (asset_name,), as_dict=True)

    return last_movement[0] if last_movement else None


@frappe.whitelist()
def apply_asset_action(asset_name, action, custodian=None, location=None):
    action = (action or "").strip()
    if action not in ALLOWED_STATUS_FLOW:
        frappe.throw(_("Unsupported asset action: {0}").format(action))

    asset = frappe.get_doc("Asset", asset_name)
    if not (asset.has_permission("write") or asset.has_permission("submit")):
        frappe.throw(_("You are not allowed to update this Asset."), frappe.PermissionError)

    current_status = (asset.status or "").strip()
    rule = ALLOWED_STATUS_FLOW[action]

    if current_status not in rule["allowed_from"]:
        frappe.throw(
            _("Asset action {0} is not allowed when status is {1}.").format(action, current_status or _("blank"))
        )

    if action == "transfer" and not custodian:
        frappe.throw(_("Custodian is required for this action."))

    if action in {"assign", "transfer", "return", "mark_available"} and not location:
        frappe.throw(_("Location is required for this action."))

    target_status = rule["to_status"]
    purpose = rule["purpose"]
    
    # Special handling for restore_to_previous
    if action == "restore_to_previous":
        prev = get_previous_custodian(asset.name)
        if prev:
            custodian = prev.to_employee
            location = prev.target_location
        else:
            frappe.throw(_("No previous custodian/location found to restore."))

    # For submitted assets, we create a Movement record first
    if asset.docstatus == 1 and action != "scrap":
        _create_asset_movement(asset, purpose, custodian, location)
        # Reload to get the new 'modified' timestamp set by Asset Movement submission
        asset.reload()

    # Update Asset fields
    if location:
        asset.location = location
        asset.branch_name = _get_branch_name(location)

    if action in {"assign", "transfer", "restore_to_previous"}:
        asset.custodian = custodian
    elif action in {"return", "send_for_repair", "mark_available", "scrap"}:
        asset.custodian = ""

    asset.status = target_status
    asset.workflow_state = target_status

    if asset.docstatus == 0:
        asset.save(ignore_permissions=True)
        if action == "assign":
            asset.submit()
            # Standard submit() calls set_status(), we must force our custom status again
            asset.db_set({
                "status": target_status,
                "workflow_state": target_status
            })
    else:
        # For already submitted assets, use db_set to bypass standard status calculation
        asset.db_set({
            "status": target_status,
            "workflow_state": target_status,
            "custodian": asset.custodian,
            "location": asset.location,
            "branch_name": asset.branch_name
        })

    asset.reload()
    return {
        "name": asset.name,
        "docstatus": asset.docstatus,
        "status": asset.status,
        "workflow_state": asset.workflow_state,
        "custodian": asset.custodian,
        "location": asset.location,
        "branch_name": getattr(asset, "branch_name", None),
    }


def _get_branch_name(location):
    branch_name = frappe.db.get_value("Sahayog Branch", location, "branch")
    return branch_name or location


def _create_asset_movement(asset, purpose, to_employee, target_location):
    if not target_location:
        target_location = asset.location

    # Only create movement if there is an actual change in either location or custodian
    if to_employee == asset.custodian and target_location == asset.location:
        return

    movement = frappe.new_doc("Asset Movement")
    movement.company = asset.company
    movement.transaction_date = now_datetime()
    movement.purpose = purpose
    movement.append("assets", {
        "asset": asset.name,
        "asset_name": asset.asset_name,
        "source_location": asset.location,
        "from_employee": asset.custodian,
        "target_location": target_location,
        "to_employee": to_employee or ""
    })
    movement.flags.ignore_validate = True
    movement.insert(ignore_permissions=True)
    movement.submit()


@frappe.whitelist()
def save_asset_after_submit(doc):
    """Save an Asset document that is already submitted, bypassing update-after-submit validation."""
    if isinstance(doc, str):
        doc = frappe.parse_json(doc)

    if not doc.get("name"):
        frappe.throw(_("Document name is required"))

    asset = frappe.get_doc("Asset", doc["name"])

    if not (asset.has_permission("write") or asset.has_permission("submit")):
        frappe.throw(_("You are not allowed to update this Asset."), frappe.PermissionError)

    allowed_fields = [
        "item_code", "asset_name", "serial_no", "custom_invoice_number",
        "brand", "zone", "state", "location", "division",
        "gross_purchase_amount", "available_for_use_date", "purchase_date",
        "custodian", "department", "asset_category", "varient",
    ]

    for field in allowed_fields:
        if field in doc:
            asset.set(field, doc[field])

    asset.flags.ignore_validate_update_after_submit = True
    asset.save(ignore_permissions=True)
    asset.reload()

    return asset

# save_asset_after_submit: Allows updating Asset fields (item_code, serial_no, etc.) after submission
# by using ignore_validate_update_after_submit flag to bypass Frappe's generic post-submit validation.
