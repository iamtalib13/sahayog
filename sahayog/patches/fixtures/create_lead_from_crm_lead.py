import frappe

def execute():
    print("🔁 Updating existing Leads with additional fields...")

    crm_leads = frappe.get_all("CRM Lead", fields=[
        "name", "mobile_no", "lead_owner", "lead_name", "gender", "salutation",
        "first_name", "last_name", "custom_lead_owner_branch",
        "custom_zone", "custom_region"
    ])
    print(f"📋 Found {len(crm_leads)} CRM Lead records.")

    updated = 0

    for crm in crm_leads:
        lead_name = frappe.db.get_value("Lead", {
            "mobile_no": crm.mobile_no,
            "owner": crm.lead_owner,
            "lead_name": crm.lead_name,
            "gender": crm.gender,
            "first_name": crm.first_name,
            "last_name": crm.last_name
        }, "name")

        if not lead_name:
            print(f"❌ No Lead found for mobile: {crm.mobile_no}, owner: {crm.lead_owner}, lead_name: {crm.lead_name}")
            continue

        lead = frappe.get_doc("Lead", lead_name)
        lead.custom_branch = crm.custom_lead_owner_branch
        lead.custom_zone = crm.custom_zone
        lead.custom_region = crm.custom_region
        lead.source = crm.source
        lead.custom_employee_id = crm.lead_owner.split("@")[0]
        lead.save(ignore_permissions=True)
        updated += 1
        print(f"✅ Updated Lead: {lead.name}")

    print(f"\n✅✅ Done. Total updated: {updated}")