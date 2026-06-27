import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Trainer", "fieldname": "trainer", "fieldtype": "Data", "width": 200},
        {"label": "Total Calls", "fieldname": "total_calls", "fieldtype": "Int", "width": 110},
        {"label": "Connected", "fieldname": "connected", "fieldtype": "Int", "width": 100},
        {"label": "Not Connected", "fieldname": "not_connected", "fieldtype": "Int", "width": 110},
        {"label": "Positive", "fieldname": "positive", "fieldtype": "Int", "width": 90},
        {"label": "Negative", "fieldname": "negative", "fieldtype": "Int", "width": 90},
        {"label": "Not Reachable", "fieldname": "not_reachable", "fieldtype": "Int", "width": 120},
        {"label": "Follow-up Cases", "fieldname": "followup_cases", "fieldtype": "Int", "width": 130},
        {"label": "Wants to Stay", "fieldname": "wants_to_stay", "fieldtype": "Int", "width": 110},
        {"label": "Want to Exit", "fieldname": "want_to_exit", "fieldtype": "Int", "width": 110},
        {"label": "Exited", "fieldname": "exited", "fieldtype": "Int", "width": 80},
    ]

    conditions = ""
    if filters.get("from_date"):
        conditions += " AND acl.calling_date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND acl.calling_date <= %(to_date)s"
    if filters.get("trainer"):
        conditions += " AND acl.trainer = %(trainer)s"

    data = frappe.db.sql(f"""
        SELECT
            COALESCE(u.full_name, acl.trainer) AS trainer,
            COUNT(acl.name) AS total_calls,
            SUM(acl.connected_status = 'Yes') AS connected,
            SUM(acl.connected_status = 'No') AS not_connected,
            SUM(acl.reply_type = 'Positive') AS positive,
            SUM(acl.reply_type = 'Negative') AS negative,
            SUM(acl.reply_type = 'Not Reachable') AS not_reachable,
            SUM(acl.reply_type = 'Follow-up Required') AS followup_cases,
            SUM(acl.wants_to_stay) AS wants_to_stay,
            SUM(acl.want_to_exit) AS want_to_exit,
            SUM(acl.exited) AS exited
        FROM `tabAgent Activation Call Log` acl
        LEFT JOIN `tabUser` u ON u.name = acl.trainer
        WHERE acl.docstatus < 2 {conditions}
        GROUP BY acl.trainer
        ORDER BY total_calls DESC
    """, filters, as_dict=1)

    return columns, data
