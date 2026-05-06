import frappe
from frappe import _
from sahayog.sahayog.doctype.approval_request.approval_request import get_permission_query_conditions

def execute(filters=None):
    if not filters:
        filters = frappe._dict({})

    columns = get_columns()
    data = get_data(filters)
    return columns, data


def get_columns():
    return [
        {"label": _("Request ID"), "fieldname": "name", "fieldtype": "Link", "options": "Approval Request", "width": 180},
        {"label": _("Employee"), "fieldname": "employee_name", "fieldtype": "Data", "width": 200},
        {"label": _("Designation"), "fieldname": "designation", "fieldtype": "Data", "width": 220},
        {"label": _("Status"), "fieldname": "approval_status", "fieldtype": "Data", "width": 150},
        {"label": _("Title"), "fieldname": "title", "fieldtype": "Data", "width": 300},
        {"label": _("Acted By"), "fieldname": "acted_by", "fieldtype": "Data", "width": 180},
        {"label": _("Creation Date"), "fieldname": "creation", "fieldtype": "Datetime", "width": 180},
        {"label": _("Approver Remark"), "fieldname": "approver_remark", "fieldtype": "Small Text", "width": 300}
    ]


def get_data(filters):
    conditions = get_conditions(filters)

    current_user = frappe.session.user

    # 🔥 ADMIN → FULL ACCESS
    if current_user != "Administrator":

        # 👉 get user's email (for matching group email)
        user_email = frappe.db.get_value("User", current_user, "email")

        conditions.append(f"""
        (
            -- ✅ requester
            ar.owner = %(current_user)s

            OR

            -- ✅ direct approver
            EXISTS (
                SELECT 1 FROM `tabApproval Approver` aa
                WHERE aa.parent = ar.name
                AND aa.selection_type = 'User'
                AND aa.approver = %(current_user)s
            )

            OR

            -- ✅ group approver
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
        # optional: apply frappe permission also
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