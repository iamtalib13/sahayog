import frappe

def execute(filters=None):
    if not filters:
        filters = {}

    user = frappe.session.user

    # Initial condition: current user is lead_owner OR assigned user
    conditions = [f"(lead_owner = %(user)s OR _assign LIKE %(assign_like)s)"]
    values = {
        "user": user,
        "assign_like": f'%"{user}"%'  # Matches exact user in JSON string
    }

    if filters.get("status"):
        conditions.append("status = %(status)s")
        values["status"] = filters["status"]

    if filters.get("source"):
        conditions.append("source = %(source)s")
        values["source"] = filters["source"]

    where_clause = " AND ".join(conditions)

    total_leads = frappe.db.sql(
        f"""SELECT COUNT(*) FROM `tabCRM Lead` WHERE {where_clause}""",
        values
    )[0][0]

    converted_conditions = conditions + ["converted = 1"]
    converted_where_clause = " AND ".join(converted_conditions)

    converted_leads = frappe.db.sql(
        f"""SELECT COUNT(*) FROM `tabCRM Lead` WHERE {converted_where_clause}""",
        values
    )[0][0]

    conversion_rate = (
        (converted_leads / total_leads * 100) if total_leads else 0
    )

    columns = [
        {"label": "Metric", "fieldname": "metric", "fieldtype": "Data", "width": 200},
        {"label": "Value", "fieldname": "value", "fieldtype": "Float", "width": 150},
    ]

    data = [
        {"metric": "Total Leads", "value": total_leads},
        {"metric": "Converted Leads", "value": converted_leads},
        {"metric": "Conversion Rate (%)", "value": round(conversion_rate, 2)},
    ]

    return columns, data
