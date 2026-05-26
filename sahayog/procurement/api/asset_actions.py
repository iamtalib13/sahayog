import frappe
from frappe import _


ALLOWED_STATUS_FLOW = {
    "assign": {"to_status": "Assigned", "allowed_from": {"", "Draft", "Submitted", "Available", "In Repair"}},
    "transfer": {"to_status": "Assigned", "allowed_from": {"Assigned"}},
    "return": {"to_status": "Available", "allowed_from": {"Assigned"}},
    "send_for_repair": {"to_status": "In Repair", "allowed_from": {"", "Draft", "Submitted", "Available", "Assigned", "In Repair"}},
    "mark_available": {"to_status": "Available", "allowed_from": {"In Repair"}},
    "scrap": {"to_status": "Scrapped", "allowed_from": {"", "Draft", "Submitted", "Available", "Assigned", "In Repair"}},
}


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

    if action in {"assign", "transfer"} and not custodian:
        frappe.throw(_("Custodian is required for this action."))

    if action in {"assign", "transfer", "return", "mark_available"} and not location:
        frappe.throw(_("Location is required for this action."))

    if location:
        asset.location = location
        asset.branch_name = _get_branch_name(location)

    if action in {"assign", "transfer"}:
        asset.custodian = custodian
    elif action in {"return", "send_for_repair", "mark_available", "scrap"}:
        asset.custodian = ""

    target_status = rule["to_status"]

    if asset.docstatus == 0:
        asset.status = target_status
        asset.save(ignore_permissions=True)

        if action == "assign":
            asset.submit()
            asset.reload()
            _apply_final_asset_state(
                asset,
                status=target_status,
                custodian=asset.custodian,
                location=asset.location,
                branch_name=getattr(asset, "branch_name", None),
            )
    else:
        if asset.docstatus == 1:
            asset.flags.ignore_validate_update_after_submit = True

        asset.status = target_status
        asset.save(ignore_permissions=True)
        asset.reload()
        _apply_final_asset_state(
            asset,
            status=target_status,
            custodian=asset.custodian,
            location=asset.location,
            branch_name=getattr(asset, "branch_name", None),
        )

    return {
        "name": asset.name,
        "docstatus": asset.docstatus,
        "status": asset.status,
        "custodian": asset.custodian,
        "location": asset.location,
        "branch_name": getattr(asset, "branch_name", None),
    }


def _get_branch_name(location):
    branch_name = frappe.db.get_value("Sahayog Branch", location, "branch")
    return branch_name or location



def _apply_final_asset_state(asset, status, custodian, location, branch_name):
    updates = {
        "status": status,
        "custodian": custodian or "",
        "location": location or "",
    }

    if hasattr(asset, "branch_name"):
        updates["branch_name"] = branch_name or location or ""

    asset.db_set(updates, update_modified=True)
    asset.reload()
