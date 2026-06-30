import frappe
from sahayog.agent_and_bdo.doctype.agent_activation_call_log.agent_query import get_trainer_filter


def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Log ID", "fieldname": "name", "fieldtype": "Link", "options": "Agent Activation Call Log", "width": 160},
        {"label": "Trainer", "fieldname": "trainer_name", "fieldtype": "Data", "width": 180},
        {"label": "Agent Code", "fieldname": "agent", "fieldtype": "Link", "options": "Agent", "width": 130},
        {"label": "Agent Name", "fieldname": "agent_name", "fieldtype": "Data", "width": 160},
        {"label": "Calling Date", "fieldname": "calling_date", "fieldtype": "Date", "width": 110},
        {"label": "Follow-up Date", "fieldname": "follow_up_date", "fieldtype": "Date", "width": 120},
        {"label": "Reply Type", "fieldname": "reply_type", "fieldtype": "Data", "width": 140},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "Data", "width": 250},
    ]

    conditions = "WHERE acl.docstatus < 2 AND acl.reply_type IN ('Follow-up Required', 'Call Back Later')"
    conditions += " " + get_trainer_filter("acl")
    if filters.get("trainer"):
        conditions += " AND acl.trainer = %(trainer)s"
    if filters.get("from_date"):
        conditions += " AND acl.calling_date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND acl.calling_date <= %(to_date)s"
    if filters.get("follow_up_date"):
        conditions += " AND acl.follow_up_date = %(follow_up_date)s"

    data = frappe.db.sql(f"""
        SELECT
            acl.name,
            COALESCE(u.full_name, acl.trainer) AS trainer_name,
            acl.agent,
            a.agent_name,
            acl.calling_date,
            acl.follow_up_date,
            acl.reply_type,
            acl.remarks
        FROM `tabAgent Activation Call Log` acl
        LEFT JOIN `tabUser` u ON u.name = acl.trainer
        LEFT JOIN `tabAgent` a ON a.name = acl.agent
        {conditions}
        ORDER BY acl.follow_up_date ASC, acl.calling_date DESC
    """, filters, as_dict=1)

    return columns, data
