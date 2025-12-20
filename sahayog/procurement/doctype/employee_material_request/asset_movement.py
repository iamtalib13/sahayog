import frappe
from erpnext.assets.doctype.asset_movement.asset_movement import AssetMovement


class CustomAssetMovement(AssetMovement):
    def on_submit(self):
        super().on_submit()
        for row in self.assets:
            asset = frappe.get_doc("Asset", row.asset)
            asset.status = "Assigned"
            asset.save(ignore_permissions=True)
        frappe.db.commit()
