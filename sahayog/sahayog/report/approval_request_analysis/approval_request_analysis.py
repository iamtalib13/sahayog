import frappe
from frappe import _
from sahayog.sahayog.doctype.approval_request.approval_request import get_permission_query_conditions

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {"label": _("Request ID"), "fieldname": "name", "fieldtype": "Link", "options": "Approval Request", "width": 300},
        {"label": _("Employee"), "fieldname": "employee_name", "fieldtype": "Data", "width": 300},
        {"label": _("Designation"), "fieldname": "designation", "fieldtype": "Data", "width": 300},
        {"label": _("Category"), "fieldname": "category", "fieldtype": "Data", "width": 300},
        {"label": _("Title"), "fieldname": "title", "fieldtype": "Data", "width": 400},
        {"label": _("Status"), "fieldname": "approval_status", "fieldtype": "Data", "width": 300},
        {"label": _("Acted By"), "fieldname": "acted_by", "fieldtype": "Data", "width": 300},
        {"label": _("Creation Date"), "fieldname": "creation", "fieldtype": "Datetime", "width": 300},
        {"label": _("Approver Remark"), "fieldname": "approver_remark", "fieldtype": "Small Text", "width": 500}
    ]

def get_data(filters):
    conditions = get_conditions(filters)
    
    # Permission Condition
    perm_cond = get_permission_query_conditions(frappe.session.user)
    if perm_cond:
        conditions.append(f"({perm_cond})")
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Query fields order MUST match columns order
    query = f"""
        SELECT 
            name, employee_name, designation, category, title, 
            approval_status, acted_by, creation, approver_remark
        FROM 
            `tabApproval Request`
        WHERE 
            {where_clause}
        ORDER BY 
            creation DESC
    """
    
    return frappe.db.sql(query, filters, as_dict=True)

def get_conditions(filters):
    conditions = []
    
    if filters.get("from_date"):
        conditions.append("creation >= %(from_date)s")
    if filters.get("to_date"):
        filters["to_date_end"] = f"{filters.get('to_date')} 23:59:59"
        conditions.append("creation <= %(to_date_end)s")
    if filters.get("employee"):
        conditions.append("employee = %(employee)s")
    if filters.get("category"):
        conditions.append("category = %(category)s")
    if filters.get("approval_status"):
        conditions.append("approval_status = %(approval_status)s")
        
    return conditions
