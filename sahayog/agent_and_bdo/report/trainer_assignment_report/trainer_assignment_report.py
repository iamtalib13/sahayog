import frappe
from sahayog.agent_and_bdo.doctype.agent_activation_call_log.agent_query import get_trainer_filter


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
    conditions += " " + get_trainer_filter("acl")
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
            COUNT(DISTINCT CASE
                WHEN acl.name = (
                    SELECT x.name FROM `tabAgent Activation Call Log` x
                    WHERE x.agent = acl.agent AND x.docstatus < 2
                    ORDER BY x.calling_date DESC, x.creation DESC
                    LIMIT 1
                ) AND acl.wants_to_stay = 1 THEN acl.agent
            END) AS active_cases,
            COUNT(DISTINCT CASE WHEN acl.reply_type = 'Follow-up Required' THEN acl.agent END) AS followup_cases,
            COUNT(DISTINCT CASE WHEN acl.exited = 1 OR acl.want_to_exit = 1 THEN acl.agent END) AS exit_cases,
            COUNT(DISTINCT CASE
                WHEN acl.exited = 0 AND acl.want_to_exit = 0
                  AND acl.wants_to_stay = 0
                  AND acl.reply_type != 'Follow-up Required'
                THEN acl.agent
            END) AS pending_cases
        FROM `tabAgent Activation Call Log` acl
        LEFT JOIN `tabUser` u ON u.name = acl.trainer
        {conditions}
        GROUP BY acl.trainer
        ORDER BY total_assigned DESC
    """, filters, as_dict=1)

    return columns, data
