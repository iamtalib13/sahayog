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
                # Reset status to Submitted so validate_cancellation passes
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
