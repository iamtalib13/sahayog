import frappe

def execute():
    print("\n" + "="*80)
    print("🔄 Starting Lead patch process...")
    print("="*80 + "\n")

    leads = frappe.get_all("Lead", filters={"lead_owner": ["!=", ""]}, fields=["name", "lead_owner"])
    print(f"📄 Total leads found with lead_owner: {len(leads)}")
    print("-"*80)

    for idx, lead in enumerate(leads, start=1):
        print(f"\n➡️ [{idx}] Processing Lead: {lead.name}")
        print("-"*80)

        lead_doc = frappe.get_doc("Lead", lead.name)

        if not lead_doc.lead_owner or "@" not in lead_doc.lead_owner:
            print(f"⛔ Skipping lead {lead.name}: Invalid lead_owner")
            continue

        # Extract employee_id from email
        employee_id = lead_doc.lead_owner.split("@")[0].strip()
        print(f"👤 Extracted Employee ID: {employee_id}")

        # Set custom_employee_id
        lead_doc.custom_employee_id = employee_id

        # Fetch Employee details
        employee = frappe.db.get_value(
            "Employee",
            {"employee": employee_id},
            ["branch", "custom_zone", "custom_region"],
            as_dict=True
        )

        if employee:
            lead_doc.custom_branch = employee.branch
            lead_doc.custom_zone = employee.custom_zone
            lead_doc.custom_region = employee.custom_region
            print(f"✅ Set branch data from Employee: {employee}")
        else:
            print(f"⚠️ No Employee found for ID: {employee_id}")

        # Save the lead document
        try:
            lead_doc.save(ignore_permissions=True)
            frappe.db.commit()
            print(f"💾 Lead saved successfully: {lead.name}")
        except Exception as e:
            print(f"❌ Error saving Lead: {lead.name} — {str(e)}")
            frappe.log_error(f"Error saving lead {lead.name}", str(e))

        print("-"*80)

    print("\n" + "="*80)
    print("✅ Patch process completed for all leads.")
    print("="*80 + "\n")
