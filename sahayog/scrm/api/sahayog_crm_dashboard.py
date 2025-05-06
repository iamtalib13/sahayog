import frappe

@frappe.whitelist()
def get_lead_dashboard_data():
    user = frappe.session.user

    if user == "Administrator":
        # Admin sees data for all users
        total_leads = frappe.db.count('CRM Lead')

        converted_leads = frappe.db.count('CRM Lead', {
            'status': 'Converted'
        })

        assigned_leads = frappe.db.count('ToDo', {
            'reference_type': 'CRM Lead',
            'status': 'Open'
        })

        status_wise = frappe.db.sql("""
            SELECT status, COUNT(name) as count
            FROM `tabCRM Lead`
            GROUP BY status
        """, as_dict=True)

    else:
        # Normal user sees only their own data
        total_leads = frappe.db.count('CRM Lead', {'lead_owner': user})

        converted_leads = frappe.db.count('CRM Lead', {
            'lead_owner': user,
            'status': 'Converted'
        })

        assigned_leads = frappe.db.sql("""
            SELECT COUNT(name)
            FROM `tabCRM Lead`
            WHERE
                status = 'New'
                AND lead_owner != %s
                AND _assign LIKE %s
        """, (user, f'%{user}%'))[0][0]


        status_wise = frappe.db.sql("""
            SELECT status, COUNT(name) as count
            FROM `tabCRM Lead`
            WHERE lead_owner = %s
            GROUP BY status
        """, (user,), as_dict=True)

        escalated_leads = frappe.db.sql("""
            SELECT COUNT(name) as count
            FROM `tabCRM Lead`
            WHERE custom_escalated_to = %s
        """, (user,), as_dict=True)

    conversion_rate = (converted_leads / total_leads) * 100 if total_leads else 0

    return {
        "total_leads": total_leads,
        "converted_leads": converted_leads,
        "assigned_leads": assigned_leads,
        "conversion_rate": round(conversion_rate, 2),
        "status_wise": status_wise,
        "escalated_leads": escalated_leads
    }
