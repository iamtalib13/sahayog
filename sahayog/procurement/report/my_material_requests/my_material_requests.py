import frappe
from frappe import _

def execute(filters=None):
    filters = filters or {}
    columns = [
        {"fieldname": "request_id", "label": _("Request ID"), "fieldtype": "Link", "options": "Employee Material Request", "width": 130},
        {"fieldname": "request_status", "label": _("Request Status"), "fieldtype": "Data", "width": 120},
        {"fieldname": "employee", "label": _("Employee"), "fieldtype": "Link", "options": "Employee", "width": 120},
        {"fieldname": "request_date", "label": _("Request Date"), "fieldtype": "Date", "width": 100},
        {"fieldname": "request_type", "label": _("Request Type"), "fieldtype": "Data", "width": 90},
        {"fieldname": "item_code", "label": _("Item Code"), "fieldtype": "Data", "width": 120},
        {"fieldname": "item_name", "label": _("Item Name"), "fieldtype": "Data", "width": 200},
        {"fieldname": "item_status", "label": _("Item Status"), "fieldtype": "Data", "width": 100},
        {"fieldname": "qty", "label": _("Quantity"), "fieldtype": "Float", "width": 90},
        {"fieldname": "item_category", "label": _("Item Category"), "fieldtype": "Data", "width": 120},
        {"fieldname": "description", "label": _("Description"), "fieldtype": "Data", "width": 200},
        {"fieldname": "remark", "label": _("Remark"), "fieldtype": "Data", "width": 200}
    ]

    conditions = []
    values = {}

    if filters.get("employee"):
        conditions.append("emr.employee = %(employee)s")
        values["employee"] = filters["employee"]

    if filters.get("request_type") and filters.get("request_type") != "All":
        conditions.append("emr.request_type = %(request_type)s")
        values["request_type"] = filters["request_type"]

    if filters.get("status") and filters.get("status") != "All":
        conditions.append("emr.status = %(status)s")
        values["status"] = filters["status"]

    # Apply date range filters only if from_date or to_date is provided
    if filters.get("from_date") and filters.get("to_date"):
        conditions.append("emr.request_date BETWEEN %(from_date)s AND %(to_date)s")
        values["from_date"] = filters["from_date"]
        values["to_date"] = filters["to_date"]
    elif filters.get("from_date"):
        conditions.append("emr.request_date >= %(from_date)s")
        values["from_date"] = filters["from_date"]
    elif filters.get("to_date"):
        conditions.append("emr.request_date <= %(to_date)s")
        values["to_date"] = filters["to_date"]

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    data = frappe.db.sql(f"""
        SELECT
            emr.name as request_id,
            emr.status as request_status,
            emr.employee,
            emr.request_date,
            emr.request_type,
            mri.item_code,
            mri.item_name,
            mri.status AS item_status,
            mri.qty,
            mri.item_category,
            mri.description,
            emr.remark
        FROM `tabEmployee Material Request` emr
        INNER JOIN `tabMaterial Request Items` mri ON mri.parent = emr.name
        {where}
        ORDER BY emr.request_date DESC, emr.name DESC
        LIMIT 100
    """, values, as_dict=1)

    return columns, data
