import frappe


def execute(filters=None):
    filters = filters or {}

    from_date = filters.get("from_date") or "1900-01-01"
    to_date = filters.get("to_date") or "2099-12-31"

    columns = [
        {"label": "Trainer", "fieldname": "trainer_name", "fieldtype": "Data", "width": 200},
        {"label": "Agent Code", "fieldname": "agent", "fieldtype": "Link", "options": "Agent", "width": 130},
        {"label": "Agent Name", "fieldname": "agent_name", "fieldtype": "Data", "width": 180},
        {"label": "Branch Code", "fieldname": "branch_code", "fieldtype": "Data", "width": 110},
        {"label": "Branch Name", "fieldname": "branch_name", "fieldtype": "Data", "width": 160},
        {"label": "Calling Attempts (All Time)", "fieldname": "calling_attempts", "fieldtype": "Int", "width": 160},
        {"label": "Last Call Date", "fieldname": "last_call_date", "fieldtype": "Date", "width": 120},
    ]

    trainer_condition = ""
    if filters.get("trainer"):
        trainer_condition = "AND acl.trainer = %(trainer)s"

    # Agents assigned to a trainer (have at least one call log) but no call made in the date range
    data = frappe.db.sql(f"""
        SELECT
            COALESCE(u.full_name, acl.trainer) AS trainer_name,
            a.name AS agent,
            a.agent_name,
            a.branch_code,
            a.branch_name,
            COUNT(acl.name) AS calling_attempts,
            MAX(acl.calling_date) AS last_call_date
        FROM `tabAgent Activation Call Log` acl
        INNER JOIN `tabAgent` a ON a.name = acl.agent AND a.calling_status != 'Exited'
        LEFT JOIN `tabUser` u ON u.name = acl.trainer
        WHERE acl.docstatus < 2
            {trainer_condition}
        GROUP BY acl.trainer, acl.agent
        HAVING SUM(
            CASE WHEN acl.calling_date BETWEEN %(from_date)s AND %(to_date)s THEN 1 ELSE 0 END
        ) = 0
        ORDER BY trainer_name, a.name
    """, {
        "from_date": from_date,
        "to_date": to_date,
        "trainer": filters.get("trainer"),
    }, as_dict=1)

    return columns, data
