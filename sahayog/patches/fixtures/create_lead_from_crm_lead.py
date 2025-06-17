import frappe

def execute():
    print("🔄 Starting CRM Lead to Lead migration/update...")

    status_mapping = {
        "New": "Lead",
        "Contacted": "Follow Up",
        "Appointed": "Follow Up",
        "Qualified": "Converted",
        "Converted": "Converted",
        "Unqualified": "Not Interested"
    }

    crm_leads = frappe.get_all("CRM Lead", fields=[
        "name", "lead_owner", "salutation", "first_name", "last_name", "mobile_no",
        "lead_name", "gender", "email", "status",
        "custom_lead_owner_branch", "custom_zone", "custom_region"
    ])

    print(f"📋 Found {len(crm_leads)} CRM Lead records to process.")

    for crm in crm_leads:
        print(f"\n➡️ Processing CRM Lead: {crm.name}")

        # Step 1: Exact match
        existing_lead_name = frappe.db.get_value("Lead", {
            "mobile_no": crm.mobile_no,
            "lead_name": crm.lead_name,
            "owner": crm.lead_owner
        }, "name")

        if existing_lead_name:
            print(f"✏️ Lead exists: {existing_lead_name}. Updating custom fields...")

            lead = frappe.get_doc("Lead", existing_lead_name)
            lead.custom_branch = crm.custom_lead_owner_branch
            lead.custom_zone = crm.custom_zone
            lead.custom_region = crm.custom_region
            lead.custom_employee_id = crm.lead_owner.split("@")[0]
            lead.save(ignore_permissions=True)
            frappe.db.commit()

            print(f"✅ Updated Lead {lead.name} with branch/zone/region/employee_id.")
            continue

        # Step 2: Potential duplicate check
        potential_duplicates = frappe.get_all("Lead", filters={"mobile_no": crm.mobile_no}, fields=["name", "lead_name", "owner"])
        if potential_duplicates:
            print(f"⚠️ Potential duplicate(s) found with same mobile number:")
            for dup in potential_duplicates:
                print(f"   → Lead: {dup.name} | Lead Name: {dup.lead_name} | Owner: {dup.owner}")

        # Step 3: Email check
        email_exists = crm.email and frappe.db.exists("Lead", {"email_id": crm.email})

        # Step 4: Create new Lead
        lead = frappe.new_doc("Lead")
        lead.lead_owner = crm.lead_owner
        lead.salutation = crm.salutation
        lead.first_name = crm.first_name
        lead.last_name = crm.last_name
        lead.mobile_no = crm.mobile_no
        lead.lead_name = crm.lead_name
        lead.gender = crm.gender
        lead.title = crm.lead_name
        lead.company_name = "Sahayog"

        if not email_exists:
            lead.email_id = crm.email
        else:
            print(f"🚫 Email {crm.email} already used. Skipping setting email_id.")

        lead.owner = crm.lead_owner
        lead.status = status_mapping.get(crm.status, "Lead")

        # Set custom fields
        lead.custom_branch = crm.custom_lead_owner_branch
        lead.custom_zone = crm.custom_zone
        lead.custom_region = crm.custom_region
        lead.custom_employee_id = crm.lead_owner.split("@")[0]

        print(f"📌 Mapped status '{crm.status}' → '{lead.status}'")
        print(f"🌍 Branch: {lead.custom_branch} | Zone: {lead.custom_zone} | Region: {lead.custom_region}")
        print(f"🆔 Employee ID: {lead.custom_employee_id}")

        # Step 5: Add child table entries (products)
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

    print("\n✅✅ Migration/Update completed successfully.")
