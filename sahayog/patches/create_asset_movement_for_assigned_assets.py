import frappe
from datetime import date

def execute():
    # 1. Fetch all assets in draft (docstatus=0) that have status = 'Draft'
    assets = frappe.get_all(
        "Asset",
        filters={
            "docstatus": 0,
            "status": "Draft"
        },
        fields=["name", "custodian", "location", "status", "company"]
    )

    default_company = "sahayog multistate credit co-op society ltd"
    companies = frappe.get_all("Company", pluck="name")
    if default_company not in companies and companies:
        default_company = companies[0]

    total = len(assets)
    assigned_count = 0
    movement_created_count = 0
    movement_skipped_count = 0
    failed_count = 0

    for asset in assets:
        try:
            # Check if the asset already has a movement
            movement_exists = frappe.db.exists("Asset Movement Item", {"asset": asset.name})

            # Determine company from asset or fallback
            company = asset.company if asset.company else default_company
            if company not in companies and companies:
                company = companies[0]

            # Validate target location (must exist in Sahayog Branch, otherwise fallback to first Sahayog Branch)
            target_location = asset.location or ""
            if not target_location or not frappe.db.exists("Sahayog Branch", target_location):
                branches = frappe.get_all("Sahayog Branch", pluck="name")
                target_location = branches[0] if branches else ""

            # Validate to_employee (must exist in Employee)
            to_employee = asset.custodian or ""
            if to_employee and not frappe.db.exists("Employee", to_employee):
                to_employee = ""

            # 1. Update Asset to status = "Assigned", docstatus = 1 (Submitted) and update custodian/location
            frappe.db.set_value("Asset", asset.name, {
                "status": "Assigned",
                "workflow_state": "Assigned",
                "docstatus": 1,
                "custodian": to_employee,
                "location": target_location
            }, update_modified=False)
            assigned_count += 1

            if movement_exists:
                movement_skipped_count += 1
                continue

            # 2. Create and submit Asset Movement
            am = frappe.new_doc("Asset Movement")
            am.company = company
            am.transaction_date = date.today().strftime("%Y-%m-%d")
            am.purpose = "Receipt"

            # Child table 'assets'
            am.append("assets", {
                "asset": asset.name,
                "target_location": target_location,
                "to_employee": to_employee
            })

            am.insert(ignore_permissions=True)
            am.submit()
            movement_created_count += 1
            frappe.logger().info(f"Submitted draft asset {asset.name} (Assigned) and created Asset Movement.")

        except Exception as e:
            failed_count += 1
            frappe.logger().error(f"Failed to process asset {asset.name}: {str(e)}")

    frappe.logger().info(
        f"\n===== Asset Assignment Patch Summary =====\n"
        f"Total Draft Assets Found: {total}\n"
        f"Successfully Assigned:    {assigned_count}\n"
        f"Asset Movements Created:  {movement_created_count}\n"
        f"Movements Skipped (exist):{movement_skipped_count}\n"
        f"Failed:                   {failed_count}\n"
        f"=========================================="
    )
