import frappe

def execute(filters=None):
    if not filters:
        filters = {}

    columns = get_columns()
    data = get_issue_register_data(filters)

    if not data:
        frappe.msgprint("No Records Found")
        return columns, data

    return columns, data

def get_columns():
    return [
        {"label": "ID", "fieldname": "name", "fieldtype": "Link", "options": "Issue Register", "width": 100},
        {"label": "Issue Title", "fieldname": "issue_title", "fieldtype": "Small Text", "width": 200},
        {"label": "Status", "fieldname": "status", "fieldtype": "Select", "width": 100},
        {"label": "Assigned Date", "fieldname": "assigned_date", "fieldtype": "Date", "width": 100},
        {"label": "Module", "fieldname": "module", "fieldtype": "Link", "options": "Module", "width": 120},
        {"label": "Raised By", "fieldname": "raised_by_emp", "fieldtype": "Data", "width": 150},
        {"label": "Raised By Department", "fieldname": "raised_by_dept", "fieldtype": "Select", "width": 150},
        {"label": "Type", "fieldname": "type", "fieldtype": "Select", "width": 80},
        {"label": "Priority", "fieldname": "priority", "fieldtype": "Select", "width": 80},
        {"label": "Test Scenario", "fieldname": "test_scenario", "fieldtype": "Text Editor", "width": 200},
        {"label": "Changes Required", "fieldname": "changes_required", "fieldtype": "Text Editor", "width": 200},
        {"label": "Prodtech", "fieldname": "prodtech", "fieldtype": "Link", "options": "Prodtech", "width": 150},
        {"label": "Handled By", "fieldname": "handled_by", "fieldtype": "Link", "options": "Prodtech", "width": 150},
        {"label": "Testing Date", "fieldname": "testing_date", "fieldtype": "Date", "width": 120},
        {"label": "Solved Date", "fieldname": "solved_date", "fieldtype": "Date", "width": 120},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "Text Editor", "width": 250}
    ]
import frappe

def get_issue_register_data(filters):
    conditions = "1=1"
    query_filters = {}

    # Handling optional date filter correctly
    if filters.get("from_date"):
        conditions += " AND assigned_date >= %(from_date)s"
        query_filters["from_date"] = filters["from_date"]

    if filters.get("to_date"):
        conditions += " AND assigned_date <= %(to_date)s"
        query_filters["to_date"] = filters["to_date"]

    sql_query = f"""
        SELECT
            *
        FROM `tabIssue Register`
        WHERE {conditions} 
        ORDER BY creation DESC

    """

    return frappe.db.sql(sql_query, query_filters, as_dict=True)
