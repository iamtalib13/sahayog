import frappe
from datetime import date

def execute():
    assets = frappe.get_all(
        "Asset",
        filters={
            "status": ["in", ["Draft", "Assigned", "Available"]]
        },
        fields=["name", "custodian", "location", "status", "company"]
    )

    default_company = "sahayog multistate credit co-op society ltd"
    companies = frappe.get_all("Company", pluck="name")
    if default_company not in companies and companies:
        default_company = companies[0]

    total = len(assets)
    draft_count = 0
    assigned_count = 0
    available_count = 0
    drafts_submitted = 0
    movement_created_count = 0
    movement_skipped_count = 0
    failed_count = 0

    for asset in assets:
        try:
            movement_exists = frappe.db.exists("Asset Movement Item", {"asset": asset.name})

            company = asset.company if asset.company else default_company
            if company not in companies and companies:
                company = companies[0]

            target_location = asset.location or ""
            if not target_location or not frappe.db.exists("Sahayog Branch", target_location):
                branches = frappe.get_all("Sahayog Branch", pluck="name")
                target_location = branches[0] if branches else ""

            to_employee = asset.custodian or ""
            if to_employee and not frappe.db.exists("Employee", to_employee):
                to_employee = ""

            # Handle Draft assets - submit and set to Assigned
            if asset.status == "Draft":
                draft_count += 1
                frappe.db.set_value("Asset", asset.name, {
                    "status": "Assigned",
                    "workflow_state": "Assigned",
                    "docstatus": 1,
                    "custodian": to_employee,
                    "location": target_location
                }, update_modified=False)
                drafts_submitted += 1
                purpose = "Receipt"
            elif asset.status == "Assigned":
                assigned_count += 1
                purpose = "Receipt"
            else:
                available_count += 1
                frappe.db.set_value("Asset", asset.name, {
                    "status": "Assigned",
                    "workflow_state": "Assigned"
                }, update_modified=False)
                purpose = "Receipt"

            if movement_exists:
                movement_skipped_count += 1
                continue

            am = frappe.new_doc("Asset Movement")
            am.company = company
            am.transaction_date = date.today().strftime("%Y-%m-%d")
            am.purpose = purpose

            am.append("assets", {
                "asset": asset.name,
                "target_location": target_location,
                "to_employee": to_employee
            })

            am.insert(ignore_permissions=True)
            am.submit()
            movement_created_count += 1
            frappe.logger().info(f"Created Asset Movement for {asset.name} ({asset.status})")

        except Exception as e:
            failed_count += 1
            frappe.logger().error(f"Failed to process asset {asset.name}: {str(e)}")

    frappe.logger().info(
        f"\n===== Asset Movement Patch Summary =====\n"
        f"Total Assets Found:         {total}\n"
        f"  - Draft:                  {draft_count}\n"
        f"  - Assigned:               {assigned_count}\n"
        f"  - Available:              {available_count}\n"
        f"Drafts Submitted:           {drafts_submitted}\n"
        f"Movements Created:          {movement_created_count}\n"
        f"Movements Skipped (exist):  {movement_skipped_count}\n"
        f"Failed:                     {failed_count}\n"
        f"========================================"
    )
