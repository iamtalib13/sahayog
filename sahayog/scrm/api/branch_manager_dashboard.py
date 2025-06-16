import frappe

@frappe.whitelist()
def get_branch_manager_dashboard():
    user = frappe.session.user
    
    # 🔹 Check if the user is an administrator
    if "Administrator" in frappe.get_roles(user):
        branch = None  # Admin users don't require a branch
    else:
        # 🔹 Fetch the branch of the user (Branch Manager role is assumed)
        user_details = frappe.db.get_value('Employee', {'user_id': user}, ['branch'], as_dict=True)

        if not user_details or not user_details.branch:
            frappe.throw("Branch information not found for the user.")

        branch = user_details.branch

    # =============================
    # 🔹 Branch-specific Data Fetch
    # =============================
    
    # 1️⃣ Total Leads in the branch
    total_leads = frappe.db.count('CRM Lead', {'custom_lead_owner_branch': branch})

    # 2️⃣ Converted Leads in the branch
    converted_leads = frappe.db.count('CRM Lead', {
        'custom_lead_owner_branch': branch,
        'converted': 1
    })

   # 3️⃣ Assigned Leads —> *Not converted, not owned by user, but assigned to the user*
    assigned_leads = frappe.db.sql("""
        SELECT COUNT(name)
        FROM `tabCRM Lead`
        WHERE
            converted = 0
            AND lead_owner != %s
            AND _assign LIKE %s
    """, (user, f'%{user}%'))[0][0]

    # 4️⃣ Status-wise Breakdown for the branch
    status_wise = frappe.db.sql("""
        SELECT status, COUNT(name) as count
        FROM `tabCRM Lead`
        WHERE custom_lead_owner_branch = %s
        GROUP BY status
    """, (branch,), as_dict=True)

    # 5️⃣ Escalated Leads for the branch with Lead names and Count
    escalated_leads = frappe.db.sql("""
        SELECT *
        FROM `tabCRM Lead`
        WHERE custom_escalated_to = %s
    """, (user), as_dict=True)

    # Count the number of escalated leads
    escalated_leads_count = len(escalated_leads)

    # 6️⃣ Conversion Rate Calculation
    conversion_rate = (converted_leads / total_leads) * 100 if total_leads else 0

    # Fetch user-wise lead data for the branch with converted and non-converted leads
    user_wise_leads = frappe.db.sql("""
        SELECT lead_owner, 
               SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) AS converted_lead_count,
               SUM(CASE WHEN converted = 0 THEN 1 ELSE 0 END) AS non_converted_lead_count
        FROM `tabCRM Lead`
        WHERE custom_lead_owner_branch = %s
        GROUP BY lead_owner
    """, (branch,), as_dict=True)

    # =============================
    # 🔹 Return the data
    # =============================
    return {
        "branch": branch,
        "total_leads": total_leads,
        "converted_leads": converted_leads,
        "assigned_leads": assigned_leads,
        "conversion_rate": round(conversion_rate, 2),
        "status_wise": status_wise,
        "escalated_leads": escalated_leads,  # Here we are passing the actual lead data
        "escalated_leads_count": escalated_leads_count,
        "user_wise_leads": user_wise_leads

    }
