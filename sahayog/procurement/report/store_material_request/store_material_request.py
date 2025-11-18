import frappe
from frappe.utils import nowdate

frappe.flags.ignore_permissions = True
frappe.flags.ignore_user_permissions = True


def get_user_warehouse():
    session_user = frappe.session.user.lower().strip()

    settings_doc = frappe.get_single("Sahayog Settings")
    wh_map = settings_doc.wh_dept_map or []

    for row in wh_map:
        user_id = (row.get("user_id") or "").lower().strip()
        if user_id == session_user:
            return row.get("warehouse")

    return None


def execute(filters=None):
    columns = [
        {"fieldname": "request_id", "label": "Request ID", "fieldtype": "Link", "options": "Employee Material Request", "width": 150},
        {"fieldname": "status", "label": "Status", "fieldtype": "Data", "width": 140},
        {"fieldname": "reporting_person_name", "label": "Reporting Person", "fieldtype": "Data", "width": 160},
        {"fieldname": "reporting_person_status", "label": "Reporting Person Status", "fieldtype": "Data", "width": 160},
        {"fieldname": "ho_person_name", "label": "HO Officer", "fieldtype": "Data", "width": 160},
        {"fieldname": "ho_officer_status", "label": "HO Officer Status", "fieldtype": "Data", "width": 160},
        {"fieldname": "requested_by_name", "label": "Executive", "fieldtype": "Data", "width": 160},
        {"fieldname": "request_age", "label": "Request Age (days)", "fieldtype": "Int", "width": 100},
        {"fieldname": "employee", "label": "Employee", "fieldtype": "Link", "options": "Employee", "width": 140},
        {"fieldname": "branch", "label": "Branch", "fieldtype": "Data", "width": 140},
        {"fieldname": "zone", "label": "Zone", "fieldtype": "Data", "width": 140},
        {"fieldname": "region", "label": "Region", "fieldtype": "Data", "width": 140},
        {"fieldname": "state", "label": "State", "fieldtype": "Data", "width": 140},
        {"fieldname": "remark", "label": "Remark", "fieldtype": "Data", "width": 200},
    ]

    session_user = frappe.session.user.lower().strip()
    warehouse = get_user_warehouse()

    if session_user not in ("administrator", "admin") and not warehouse:
        return columns, []

    is_admin = 1 if session_user in ("administrator", "admin") else 0

    data = frappe.db.sql("""
        SELECT 
            emr.name AS request_id,
            emr.status,
            emr.employee,

            branch.branch,
            branch.zone,
            branch.region,
            branch.state,

            req_user.full_name AS requested_by_name,
            rep_user.full_name AS reporting_person_name,
            emr.reporting_person_status,

            ho_user.full_name AS ho_person_name,
            emr.ho_officer_status,

            DATEDIFF(%(today)s, emr.creation) AS request_age,
            emr.remark

        FROM `tabEmployee Material Request` emr

        LEFT JOIN `tabSahayog Branch` branch 
            ON emr.target_warehouse = branch.name

        LEFT JOIN `tabUser` req_user 
            ON emr.requested_by = req_user.name

        LEFT JOIN `tabUser` rep_user 
            ON emr.reporting_person = rep_user.name

        LEFT JOIN `tabUser` ho_user 
            ON emr.head_office_officer = ho_user.name

        WHERE
            (%(is_admin)s = 1)
            OR
            (%(is_admin)s = 0 AND TRIM(LOWER(emr.source_warehouse)) = TRIM(LOWER(%(warehouse)s)))

        ORDER BY emr.creation DESC
    """, {
        "is_admin": is_admin,
        "warehouse": warehouse,
        "today": nowdate(),
    }, as_dict=True)

    approved_count = sum(1 for d in data if d["status"] == "Approved")
    pending_count = sum(
        1 for d in data if d["status"] in ("Pending Reporting Person", "Pending HO Approval")
    )

    summary = {
        "warehouse": warehouse or "-",
        "user": frappe.get_value("User", frappe.session.user, "full_name"),
        "approved": approved_count,
        "pending": pending_count
    }

    # # 🔍 DEBUG POPUP
    # frappe.msgprint(f"""
    # <h4>Debug Data</h4>
    # <b>Summary:</b><br>{summary}<br><br>
    # <b>Data Rows:</b><br>{data}
    # """)

    return columns, data, None, summary
