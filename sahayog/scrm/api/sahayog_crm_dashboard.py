import frappe
from frappe.utils import get_datetime_str, now_datetime

@frappe.whitelist()
def get_lead_dashboard_data():
    user = frappe.session.user

    if user == "Administrator":
        # Admin sees data for all users
        total_leads = frappe.db.count('CRM Lead')

        converted_leads = frappe.db.count('CRM Lead', {
            'status': 'Qualified',
            'converted': 1
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
            'Converted': 1
        })

        assigned_leads = frappe.db.sql("""
            SELECT COUNT(name)
            FROM `tabCRM Lead`
            WHERE
                converted = 0
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
            AND converted = 0
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

@frappe.whitelist()
def get_today_tasks():
    user = frappe.session.user
    now = now_datetime()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=0)

    tasks = frappe.db.sql("""
        SELECT *
        FROM `tabCRM Task`
        WHERE assigned_to = %s
        AND status = 'Todo'
        AND DATE(due_date) = CURDATE()
        AND reference_doctype = 'CRM Lead'
        ORDER BY due_date ASC
    """, (user,), as_dict=True)

    return tasks

# fetch the data from CRM Lead doctype 
@frappe.whitelist(allow_guest=True)
def get_zone_region_data():
    # Fetch all unique zones from the database
    all_zones = frappe.db.sql("""
        SELECT DISTINCT TRIM(custom_zone) AS zone 
        FROM `tabCRM Lead`
        WHERE custom_zone IS NOT NULL
        ORDER BY zone
    """, as_list=True)

    # Flatten the list of tuples
    all_zones = [zone[0] for zone in all_zones]

    # Fetch the actual zone-region data
    result = frappe.db.sql("""
        SELECT TRIM(custom_zone) AS zone, TRIM(custom_region) AS region, COUNT(name) AS region_count
        FROM `tabCRM Lead`
        WHERE custom_zone IS NOT NULL AND custom_region IS NOT NULL
        GROUP BY custom_zone, custom_region
    """, as_dict=True)

    frappe.log_error(message=f"Zone-Region Data: {result}", title="Zone Region Fetch Log")

    # Get unique regions from the result
    regions = list(set(item['region'] for item in result))
    
    # Initialize the data structure with 0 for missing zones
    zone_region_counts = {zone: {region: 0 for region in regions} for zone in all_zones}

    # Fill in the data from the result
    for item in result:
        zone_region_counts[item['zone']][item['region']] = item['region_count']

    # Prepare the chart data
    chart_data = {
        'labels': all_zones,
        'datasets': []
    }

    # Create datasets for each region
    for region in regions:
        dataset = {
            'name': region,
            'values': [zone_region_counts[zone].get(region, 0) for zone in all_zones]
        }
        chart_data['datasets'].append(dataset)

    return chart_data

# fetch the data from Lead doctype
@frappe.whitelist(allow_guest=True)
def get_zone_region_data_lead():
    # Fetch all unique zones from the database
    all_zones = frappe.db.sql("""
        SELECT DISTINCT TRIM(custom_zone) AS zone 
        FROM `tabLead`
        WHERE custom_zone IS NOT NULL
        ORDER BY zone
    """, as_list=True)

    # Flatten the list of tuples
    all_zones = [zone[0] for zone in all_zones]

    # Fetch the actual zone-region data
    result = frappe.db.sql("""
        SELECT TRIM(custom_zone) AS zone, TRIM(custom_region) AS region, COUNT(name) AS region_count
        FROM `tabLead`
        WHERE custom_zone IS NOT NULL AND custom_region IS NOT NULL
        GROUP BY custom_zone, custom_region
    """, as_dict=True)

    frappe.log_error(message=f"Zone-Region Data: {result}", title="Zone Region Fetch Log")

    # Get unique regions from the result
    regions = list(set(item['region'] for item in result))
    
    # Initialize the data structure with 0 for missing zones
    zone_region_counts = {zone: {region: 0 for region in regions} for zone in all_zones}

    # Fill in the data from the result
    for item in result:
        zone_region_counts[item['zone']][item['region']] = item['region_count']

    # Prepare the chart data
    chart_data = {
        'labels': all_zones,
        'datasets': []
    }

    # Create datasets for each region
    for region in regions:
        dataset = {
            'name': region,
            'values': [zone_region_counts[zone].get(region, 0) for zone in all_zones]
        }
        chart_data['datasets'].append(dataset)

    return chart_data

@frappe.whitelist()
def get_all_crm_view_settings():
    try:
        # Fetch all records from the table
        records = frappe.db.get_all(
            "CRM View Settings",
            fields=["*"]  # or specify only required fields for performance
        )

        return records

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in get_all_crm_view_settings")
        return {"error": "Internal server error"}
    
