import frappe

def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Calling Date", "fieldname": "calling_date", "fieldtype": "Date", "width": 110},
        {"label": "Trainer", "fieldname": "trainer_name", "fieldtype": "Data", "width": 180},
        {"label": "Agent Code", "fieldname": "agent", "fieldtype": "Link", "options": "Agent", "width": 130},
        {"label": "Agent Name", "fieldname": "agent_name", "fieldtype": "Data", "width": 180},
        {"label": "Mobile No", "fieldname": "agent_phone_number", "fieldtype": "Data", "width": 120},
        {"label": "Branch Code", "fieldname": "branch_code", "fieldtype": "Data", "width": 110},
        {"label": "Branch Name", "fieldname": "branch_name", "fieldtype": "Data", "width": 160},
        {"label": "Date of Exit", "fieldname": "date_of_exit", "fieldtype": "Date", "width": 110},
    ]

    conditions = "WHERE ac.docstatus < 2 AND (ac.exited = 1 OR ac.want_to_exit = 1)"
    if filters.get("from_date"):
        conditions += " AND ac.calling_date >= %(from_date)s"
    if filters.get("to_date"):
        conditions += " AND ac.calling_date <= %(to_date)s"
    if filters.get("trainer"):
        conditions += " AND ac.trainer = %(trainer)s"

    data = frappe.db.sql(f"""
        SELECT
            ac.calling_date,
            COALESCE(u.full_name, ac.trainer) AS trainer_name,
            ac.agent,
            a.agent_name,
            ac.agent_phone_number,
            a.branch_code,
            a.branch_name,
            ac.date_of_exit
        FROM `tabAgent Activation Call Log` ac
        LEFT JOIN `tabUser` u ON u.name = ac.trainer
        LEFT JOIN `tabAgent` a ON a.name = ac.agent
        {conditions}
        ORDER BY ac.calling_date DESC
    """, filters, as_dict=1)

    trainer_exit_count = {}
    for row in data:
        name = row.trainer_name or "Unknown"
        trainer_exit_count[name] = trainer_exit_count.get(name, 0) + 1

    chart = {
        "data": {
            "labels": list(trainer_exit_count.keys()),
            "datasets": [{"name": "Exited Agents", "values": list(trainer_exit_count.values())}],
        },
        "type": "bar",
        "colors": ["#e74c3c"],
    }

    return columns, data, None, chart
