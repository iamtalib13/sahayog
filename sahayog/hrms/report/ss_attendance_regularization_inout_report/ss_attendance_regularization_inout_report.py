import frappe
from frappe import _
from frappe.utils import getdate
from datetime import date, timedelta, datetime


def execute(filters=None):
    filters = filters or {}

    from_date = filters.get("from_date") or date.today().replace(day=1)
    to_date = filters.get("to_date") or date.today()

    if isinstance(from_date, str):
        from_date = getdate(from_date)
    if isinstance(to_date, str):
        to_date = getdate(to_date)

    columns = [
        {"label": "Employee Code", "fieldname": "employee", "fieldtype": "Link", "options": "Employee", "width": 110},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 170},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 140},
        {"label": "Department", "fieldname": "department", "fieldtype": "Data", "width": 130},
        {"label": "Shift", "fieldname": "shift", "fieldtype": "Data", "width": 110},
        {"label": "Shift In-Time", "fieldname": "shift_in_time", "fieldtype": "Data", "width": 90},
        {"label": "Shift Out-Time", "fieldname": "shift_out_time", "fieldtype": "Data", "width": 90},
        {"label": "Date", "fieldname": "attendance_date", "fieldtype": "Date", "width": 100},
        {"label": "Punch In", "fieldname": "punch_in", "fieldtype": "Data", "width": 80},
        {"label": "Punch Out", "fieldname": "punch_out", "fieldtype": "Data", "width": 80},
        {"label": "Attendance Status", "fieldname": "attendance_status", "fieldtype": "Data", "width": 120},
        {"label": "Regularization Status", "fieldname": "correction_status", "fieldtype": "Data", "width": 120},
        {"label": "Requested Status", "fieldname": "requested_status", "fieldtype": "Data", "width": 120},
        {"label": "Regularization Reason", "fieldname": "correction_reason", "fieldtype": "Data", "width": 200},
        {"label": "Approved By", "fieldname": "approved_by", "fieldtype": "Data", "width": 120},
        {"label": "Approval Name", "fieldname": "approval_name", "fieldtype": "Data", "width": 150},
        {"label": "Approval Date", "fieldname": "approval_date", "fieldtype": "Datetime", "width": 140},
    ]

    conditions = "AND e.custom_is_support_staff = 1"
    if filters.get("employee"):
        conditions += " AND e.name = %(employee)s"
    if filters.get("branch"):
        conditions += " AND e.branch = %(branch)s"
    if filters.get("department"):
        conditions += " AND e.department = %(department)s"

    employees = frappe.db.sql(f"""
        SELECT e.name, e.employee_name, e.branch, e.department, e.default_shift
        FROM `tabEmployee` e
        WHERE e.custom_is_support_staff = 1 {conditions}
        ORDER BY CAST(REGEXP_REPLACE(e.name, '[^0-9]', '') AS UNSIGNED), e.name
    """, filters, as_dict=True)

    if not employees:
        return columns, []

    emp_names = [e.name for e in employees]

    # Fetch Shift Type timings
    shift_map = {}
    for s in frappe.db.sql("SELECT name, start_time, end_time FROM `tabShift Type`", as_dict=True):
        shift_map[s.name] = s

    def fmt_shift_time(td):
        if not td:
            return ""
        return (datetime.min + td).strftime("%H:%M")

    # Fetch Attendance records
    attendances = frappe.db.sql("""
        SELECT a.employee, a.attendance_date, a.status
        FROM `tabAttendance` a
        WHERE a.employee IN %(emps)s
          AND a.attendance_date BETWEEN %(from)s AND %(to)s
          AND a.docstatus = 1
        ORDER BY a.employee, a.attendance_date
    """, {"emps": emp_names, "from": from_date, "to": to_date}, as_dict=True)

    # Fetch Employee Checkin records (group by employee + date, get first IN and last OUT)
    checkins = frappe.db.sql("""
        SELECT ec.employee, DATE(ec.time) as cdate,
               MIN(CASE WHEN ec.log_type = 'IN' THEN ec.time END) as first_in,
               MAX(CASE WHEN ec.log_type = 'OUT' THEN ec.time END) as last_out
        FROM `tabEmployee Checkin` ec
        WHERE ec.employee IN %(emps)s
          AND DATE(ec.time) BETWEEN %(from)s AND %(to)s
        GROUP BY ec.employee, DATE(ec.time)
        ORDER BY ec.employee, DATE(ec.time)
    """, {"emps": emp_names, "from": from_date, "to": to_date}, as_dict=True)

    # Fetch Attendance Correction records
    corrections = frappe.db.sql("""
        SELECT ac.employee, ac.attendance_date, ac.status, ac.requested_status,
               ac.reason, ac.approved_by, ac.approval_date
        FROM `tabAttendance Correction` ac
        WHERE ac.employee IN %(emps)s
          AND ac.attendance_date BETWEEN %(from)s AND %(to)s
        ORDER BY ac.employee, ac.attendance_date
    """, {"emps": emp_names, "from": from_date, "to": to_date}, as_dict=True)

    # Build lookup maps
    att_map = {}
    for a in attendances:
        att_map[(a.employee, str(a.attendance_date))] = a.status

    checkin_map = {}
    for c in checkins:
        checkin_map[(c.employee, str(c.cdate))] = (c.first_in, c.last_out)

    corr_map = {}
    for c in corrections:
        corr_map[(c.employee, str(c.attendance_date))] = c

    # Approver full names
    approver_ids = list({c.approved_by for c in corrections if c.approved_by})
    approver_names = {}
    if approver_ids:
        for u in frappe.db.sql(
            "SELECT name, full_name FROM `tabUser` WHERE name IN %(ids)s",
            {"ids": approver_ids}, as_dict=True):
            approver_names[u.name] = u.full_name or u.name

    # Build data rows — one row per employee per date
    data = []
    emp_info = {e.name: e for e in employees}

    for ename in emp_names:
        d = from_date
        while d <= to_date:
            ds = str(d)
            att_status = att_map.get((ename, ds), "")
            ci = checkin_map.get((ename, ds), (None, None))
            corr = corr_map.get((ename, ds), None)

            pi = ci[0].strftime("%H:%M") if ci[0] else ""
            po = ci[1].strftime("%H:%M") if ci[1] else ""

            corr_status = corr.status if corr else ""
            req_status = corr.requested_status if corr else ""
            reason = corr.reason if corr else ""
            approved_by = corr.approved_by if corr else ""
            approval_date = corr.approval_date if corr else ""

            data.append({
                "employee": ename,
                "employee_name": emp_info[ename].employee_name,
                "branch": emp_info[ename].branch,
                "department": emp_info[ename].department,
                "shift": emp_info[ename].default_shift or "",
                "shift_in_time": fmt_shift_time(shift_map.get(emp_info[ename].default_shift, {}).start_time) if emp_info[ename].default_shift and shift_map.get(emp_info[ename].default_shift) else "",
                "shift_out_time": fmt_shift_time(shift_map.get(emp_info[ename].default_shift, {}).end_time) if emp_info[ename].default_shift and shift_map.get(emp_info[ename].default_shift) else "",
                "attendance_date": d,
                "punch_in": pi,
                "punch_out": po,
                "attendance_status": att_status,
                "correction_status": corr_status,
                "requested_status": req_status,
                "correction_reason": reason,
                "approved_by": approved_by,
                "approval_name": approver_names.get(approved_by, ""),
                "approval_date": approval_date,
            })
            d += timedelta(days=1)

    return columns, data
