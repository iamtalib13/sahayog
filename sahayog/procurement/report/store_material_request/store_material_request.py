import frappe
from frappe.utils import nowdate

def execute(filters=None):
    columns = [
        {"fieldname": "request_id", "label": "Request ID", "fieldtype": "Link", "options": "Employee Material Request", "width": 150},
        {"fieldname": "status", "label": "Status", "fieldtype": "Data", "width": 100},
        {"fieldname": "employee", "label": "Employee", "fieldtype": "Link", "options": "Employee", "width": 120},
        {"fieldname": "branch", "label": "Branch", "fieldtype": "Data", "width": 120},
        {"fieldname": "zone", "label": "Zone", "fieldtype": "Data", "width": 120},
        {"fieldname": "region", "label": "Region", "fieldtype": "Data", "width": 120},
        {"fieldname": "state", "label": "State", "fieldtype": "Data", "width": 120},
        {"fieldname": "requested_by", "label": "Requested By", "fieldtype": "Link", "options": "User", "width": 120},
        {"fieldname": "reporting_person_name", "label": "Requested Person Name", "fieldtype": "Data", "width": 150},
        {"fieldname": "reporting_person", "label": "Reporting Person", "fieldtype": "Link", "options": "User", "width": 120},
        {"fieldname": "reporting_person_status", "label": "Reporting Person Status", "fieldtype": "Data", "width": 150},
        {"fieldname": "head_office_officer", "label": "Head Office Officer", "fieldtype": "Link", "options": "User", "width": 120},
        {"fieldname": "ho_officer_status", "label": "HO Officer Status", "fieldtype": "Data", "width": 150},
        {"fieldname": "request_age", "label": "Request Age (days)", "fieldtype": "Int", "width": 90},
        {"fieldname": "remark", "label": "Remark", "fieldtype": "Data", "width": 200},
    ]
# 
    data = frappe.db.sql("""
        SELECT 
            emr.name AS request_id,
            emr.status,
            emr.employee,
            branch.branch,
            branch.zone,
            branch.region,
            branch.state,
            emr.requested_by,
            emr.reporting_person,
            user.full_name AS reporting_person_name,
            emr.reporting_person_status,
            emr.head_office_officer,
            emr.ho_officer_status,
            DATEDIFF(%s, emr.creation) AS request_age,
            emr.remarkgit commit -
        FROM `tabEmployee Material Request` emr
        LEFT JOIN `tabSahayog Branch` branch ON emr.target_warehouse = branch.name
        LEFT JOIN `tabUser` user ON emr.reporting_person = user.name
        ORDER BY emr.creation DESC
    """, (nowdate(),), as_dict=True)

    return columns, data
