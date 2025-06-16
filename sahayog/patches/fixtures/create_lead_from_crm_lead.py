import frappe

def execute():
    print("🔄 Starting CRM Lead to Lead migration...")

    status_mapping = {
        "New": "Lead",
        "Contacted": "Follow Up",
        "Appointed": "Follow Up",
        "Qualified": "Converted",
        "Converted": "Converted",
        "Unqualified": "Not Interested"
    }

    crm_leads = frappe.get_all("CRM Lead", fields=["*"])
    print(f"📋 Found {len(crm_leads)} CRM Lead records to process.")

    for crm in crm_leads:
        print(f"\n➡️ Processing CRM Lead: {crm.name}")

        # Check if already exists for this mobile + owner
        if frappe.db.exists("Lead", {"mobile_no": crm.mobile_no, "owner": crm.lead_owner}):
            print(f"⚠️ Lead with mobile {crm.mobile_no} and owner {crm.lead_owner} already exists. Skipping.")
            continue

        lead = frappe.new_doc("Lead")
        lead.lead_owner = crm.lead_owner
        lead.salutation = crm.salutation
        lead.first_name = crm.first_name
        lead.last_name = crm.last_name
        lead.mobile_no = crm.mobile_no
        lead.lead_name = crm.lead_name
        lead.gender = crm.gender
        lead.email_id = crm.email
        lead.title = crm.lead_name
        lead.company_name = "Sahayog"

        # Set document owner
        lead.owner = crm.lead_owner
        print(f"👤 Setting doc.owner = {lead.owner}")

        # Status mapping logic
        lead.status = status_mapping.get(crm.status, "Lead")
        print(f"📌 Mapped status '{crm.status}' → '{lead.status}'")

        # Child table mapping
        products = frappe.get_all("CRM Products", filters={"parent": crm.name}, fields=["product_code", "product_name"])
        print(f"🧾 Found {len(products)} products for CRM Lead: {crm.name}")
        for prod in products:
            lead.append("custom_product_table", {
                "product": prod.product_code,
                "product_name": prod.product_name
            })
            print(f"  ➕ Added product: {prod.product_code} - {prod.product_name}")

        lead.insert(ignore_permissions=True)
        frappe.db.commit()
        print(f"✅ Lead created: {lead.name} | Owner: {lead.owner}")

    print("\n✅✅ Migration completed successfully.")
