import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Trainer", "fieldname": "trainer_name", "fieldtype": "Data", "width": 200},
        {"label": "Total Assigned", "fieldname": "total_assigned", "fieldtype": "Int", "width": 130},
        {"label": "Active Cases", "fieldname": "active_cases", "fieldtype": "Int", "width": 120},
        {"label": "Follow-up Cases", "fieldname": "followup_cases", "fieldtype": "Int", "width": 130},
        {"label": "Exit Cases", "fieldname": "exit_cases", "fieldtype": "Int", "width": 110},
        {"label": "Pending Cases", "fieldname": "pending_cases", "fieldtype": "Int", "width": 120},
    ]

    conditions = "WHERE acl.docstatus < 2"
    if filters.get("trainer"):
        conditions += " AND acl.trainer = %(trainer)s"
    if filters.get("from_date"):
        conditions += " AND acl.calling_date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND acl.calling_date <= %(to_date)s"

    data = frappe.db.sql(f"""
        SELECT
            COALESCE(u.full_name, acl.trainer) AS trainer_name,
            COUNT(DISTINCT acl.agent) AS total_assigned,
            SUM(acl.wants_to_stay) AS active_cases,
            SUM(acl.reply_type IN ('Follow-up Required', 'Call Back Later')) AS followup_cases,
            SUM(acl.exited) AS exit_cases,
            COUNT(DISTINCT acl.agent)
                - SUM(acl.wants_to_stay)
                - SUM(acl.reply_type IN ('Follow-up Required', 'Call Back Later'))
                - SUM(acl.exited) AS pending_cases
        FROM `tabAgent Activation Call Log` acl
        LEFT JOIN `tabUser` u ON u.name = acl.trainer
        {conditions}
        GROUP BY acl.trainer
        ORDER BY total_assigned DESC
    """, filters, as_dict=1)

    return columns, data
