import frappe
from frappe import _
from sahayog.sahayog.doctype.approval_request.approval_request import get_permission_query_conditions

def execute(filters=None):
    if not filters:
        filters = frappe._dict({})

    columns = get_columns()
    data = get_data(filters)
    
    # Summary Logic inside execute
    report_summary = get_report_summary(data)
    
    return columns, data, None, None, report_summary

def get_report_summary(data):
    if not data:
        return []

    total_requests = len(data)
    draft = sum(1 for d in data if d.get("approval_status") == "Draft")
    pending = sum(1 for d in data if d.get("approval_status") == "Pending Approval")
    approved = sum(1 for d in data if d.get("approval_status") == "Approved")
    rejected = sum(1 for d in data if d.get("approval_status") == "Rejected")

    return [
        {"label": _("Total Requests"), "value": total_requests, "indicator": "Blue"},
        {"label": _("Draft"), "value": draft, "indicator": "Gray"},
        {"label": _("Pending Approval"), "value": pending, "indicator": "Orange"},
        {"label": _("Approved"), "value": approved, "indicator": "Green"},
        {"label": _("Rejected"), "value": rejected, "indicator": "Red"},
    ]

def get_columns():
    return [
        {"label": _("Request ID"), "fieldname": "name", "fieldtype": "Link", "options": "Approval Request", "width": 200},
        {"label": _("Requester Employee"), "fieldname": "employee_name", "fieldtype": "Data", "width": 220},
        {"label": _("Requester Designation"), "fieldname": "designation", "fieldtype": "Data", "width": 220},
        {"label": _("Status"), "fieldname": "approval_status", "fieldtype": "Data", "width": 160},
        {"label": _("Title"), "fieldname": "title", "fieldtype": "Data", "width": 400},
        {"label": _("Acted By Approver"), "fieldname": "acted_by", "fieldtype": "Data", "width": 200},
        {"label": _("Creation Date"), "fieldname": "creation", "fieldtype": "Datetime", "width": 200},
        {"label": _("Approver Remark"), "fieldname": "approver_remark", "fieldtype": "Small Text", "width": 400}
    ]

def get_data(filters):
    conditions = get_conditions(filters)
    current_user = frappe.session.user

    if current_user != "Administrator":
        user_email = frappe.db.get_value("User", current_user, "email")
        conditions.append(f"""
        (
            ar.owner = %(current_user)s
            OR
            EXISTS (
                SELECT 1 FROM `tabApproval Approver` aa
                WHERE aa.parent = ar.name
                AND aa.selection_type = 'User'
                AND aa.approver = %(current_user)s
            )
            OR
            EXISTS (
                SELECT 1 FROM `tabApproval Approver` aa
                WHERE aa.parent = ar.name
                AND aa.selection_type = 'Group'
                AND aa.group_email = %(user_email)s
            )
        )
        """)
        filters["current_user"] = current_user
        filters["user_email"] = user_email
    else:
        perm_cond = get_permission_query_conditions(current_user)
        if perm_cond:
            conditions.append(f"({perm_cond})")

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    query = f"""
        SELECT 
            ar.name,
            ar.employee_name,
            ar.designation,
            ar.approval_status,
            ar.title,
            ar.acted_by,
            ar.creation,
            ar.approver_remark
        FROM 
            `tabApproval Request` ar
        WHERE 
            {where_clause}
        ORDER BY 
            ar.creation DESC
    """

    return frappe.db.sql(query, filters, as_dict=True)

def get_conditions(filters):
    conditions = []
    if filters.get("from_date"):
        conditions.append("ar.creation >= %(from_date)s")
    if filters.get("to_date"):
        filters["to_date_end"] = f"{filters.get('to_date')} 23:59:59"
        conditions.append("ar.creation <= %(to_date_end)s")
    if filters.get("employee"):
        conditions.append("ar.employee = %(employee)s")
    if filters.get("approval_status"):
        conditions.append("ar.approval_status = %(approval_status)s")

    return conditions
