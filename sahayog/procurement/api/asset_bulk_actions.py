import frappe
from frappe import _


def cancel_linked_docs(asset_name):
    """Cancel and delete all linked documents before cancelling the Asset."""

    # Delete linked Asset Activities (non-submittable log)
    activities = frappe.get_all(
        "Asset Activity",
        filters={"asset": asset_name},
        pluck="name",
    )
    for activity_name in activities:
        frappe.delete_doc("Asset Activity", activity_name, ignore_permissions=True)
        frappe.db.commit()

    # Cancel linked Asset Movements (via child table)
    movements = frappe.db.sql(
        """SELECT DISTINCT asm.name
        FROM `tabAsset Movement` asm
        INNER JOIN `tabAsset Movement Item` asm_item ON asm_item.parent = asm.name
        WHERE asm_item.asset = %s AND asm.docstatus = 1""",
        asset_name,
        as_dict=True,
    )
    for movement in movements:
        doc = frappe.get_doc("Asset Movement", movement.name)
        doc.cancel()
        frappe.db.commit()

    # Cancel linked Journal Entries referencing this asset
    je_accounts = frappe.db.sql(
        """SELECT DISTINCT parent FROM `tabJournal Entry Account`
           WHERE reference_type = 'Asset' AND reference_name = %s""",
        asset_name,
        as_dict=True,
    )
    for row in je_accounts:
        je_docstatus = frappe.db.get_value("Journal Entry", row.parent, "docstatus")
        if je_docstatus == 1:
            doc = frappe.get_doc("Journal Entry", row.parent)
            doc.cancel()
            frappe.db.commit()


@frappe.whitelist()
def bulk_delete_assets(asset_names):
    if isinstance(asset_names, str):
        asset_names = frappe.parse_json(asset_names)

    if not asset_names:
        frappe.throw(_("No assets selected"))

    deleted = 0
    failed = []
    errors = {}

    for name in asset_names:
        try:
            docstatus = frappe.db.get_value("Asset", name, "docstatus")
            if docstatus == 1:
                cancel_linked_docs(name)
                frappe.db.sql("UPDATE `tabAsset` SET status='Submitted' WHERE name=%s", name)
                frappe.db.commit()
                frappe.get_doc("Asset", name).cancel()
                frappe.db.commit()
            frappe.delete_doc("Asset", name, force=True, ignore_permissions=True)
            frappe.db.commit()
            deleted += 1
        except Exception as e:
            frappe.db.rollback()
            failed.append(name)
            errors[name] = str(e)

    return {"deleted": deleted, "failed": failed, "errors": errors}


@frappe.whitelist()
def bulk_update_assets(asset_names, location):
    if isinstance(asset_names, str):
        asset_names = frappe.parse_json(asset_names)

    if not asset_names:
        frappe.throw(_("No assets selected"))

    if not location:
        frappe.throw(_("Location is required"))

    branch_name = frappe.db.get_value("Sahayog Branch", location, "branch")

    updated = 0
    failed = []
    errors = {}

    for name in asset_names:
        try:
            frappe.db.sql(
                "UPDATE `tabAsset` SET location=%s, branch_name=%s WHERE name=%s",
                (location, branch_name, name),
            )
            frappe.db.commit()
            updated += 1
        except Exception as e:
            frappe.db.rollback()
            failed.append(name)
            errors[name] = str(e)

    return {"updated": updated, "failed": failed, "errors": errors}


@frappe.whitelist()
def update_emr_fields(name, target_warehouse=None, source_warehouse=None, required_by_date=None):
    updates = []
    values = []
    if target_warehouse is not None:
        updates.append("target_warehouse=%s")
        values.append(target_warehouse)
    if source_warehouse is not None:
        updates.append("source_warehouse=%s")
        values.append(source_warehouse)
    if required_by_date is not None:
        updates.append("required_by_date=%s")
        values.append(required_by_date)

    if not updates:
        frappe.throw(_("No fields to update"))

    values.append(name)
    frappe.db.sql(
        f"UPDATE `tabEmployee Material Request` SET {', '.join(updates)} WHERE name=%s",
        values,
    )
    frappe.db.commit()
    return {"success": True}


@frappe.whitelist()
def create_asset_with_name(doc, custom_name=None):
    if isinstance(doc, str):
        doc = frappe.parse_json(doc)

    if not doc.get("doctype"):
        frappe.throw(_("Invalid document"))

    new_doc = frappe.get_doc(doc)
    new_doc.insert()

    if custom_name and new_doc.name != custom_name:
        frappe.rename_doc("Asset", new_doc.name, custom_name, force=True)
        new_doc.name = custom_name

    return {"name": new_doc.name}
