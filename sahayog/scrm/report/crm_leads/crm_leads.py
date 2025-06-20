import frappe

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters or {})
    return columns, data

def get_columns():
    return [
        {"label": "Lead Owner", "fieldname": "lead_owner", "fieldtype": "Data", "width": 200},
        {"label": "Lead Name", "fieldname": "lead_name", "fieldtype": "Data", "width": 200},
        {"label": "Status", "fieldname": "status", "fieldtype": "Link", "options": "CRM Lead Status", "width": 120},
        {"label": "Source", "fieldname": "source", "fieldtype": "Link", "options": "CRM Lead Source", "width": 120},
        {"label": "Email", "fieldname": "email", "fieldtype": "Data", "width": 180},
        {"label": "Phone", "fieldname": "phone", "fieldtype": "Data", "width": 120},
        {"label": "Mobile", "fieldname": "mobile_no", "fieldtype": "Data", "width": 120},
        {"label": "Organization", "fieldname": "organization", "fieldtype": "Data", "width": 180},
       	{"label": "Created On", "fieldname": "creation", "fieldtype": "Datetime", "width": 150},
        {"label": "Converted", "fieldname": "converted", "fieldtype": "Data", "width": 100},
    ]

def get_data(filters):
    conditions = {}
    if filters.get("status"):
        conditions["status"] = filters["status"]
    if filters.get("lead_owner"):
        conditions["lead_owner"] = filters["lead_owner"]

    leads = frappe.get_all("CRM Lead",
        filters=conditions,
        fields=[
            "lead_owner", "lead_name", "email", "phone", "mobile_no",
            "organization", "status", "source", "creation", "converted"
        ],
        order_by="creation desc"
    )

    # Collect unique lead owners
    owner_ids = list({lead["lead_owner"] for lead in leads if lead.get("lead_owner")})
    user_map = frappe._dict({
        u.name: u.full_name or u.name
        for u in frappe.get_all("User", filters={"name": ["in", owner_ids]}, fields=["name", "full_name"])
    })

    # Replace lead_owner id with full name and converted with Yes/No
    for lead in leads:
        lead["lead_owner"] = user_map.get(lead["lead_owner"], lead["lead_owner"])
        lead["converted"] = "Yes" if lead.get("converted") else "No"

    return leads
