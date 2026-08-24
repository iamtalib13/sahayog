import frappe
from frappe import _
from frappe.utils import getdate, add_days, date_diff, flt
from datetime import date, timedelta


def get_attendance_cycle(month, year):
    """Return (from_date, to_date) for attendance cycle of given month.
    Cycle: 26th of (month-1) to 25th of month."""
    if month == 1:
        from_date = date(year - 1, 12, 26)
    else:
        from_date = date(year, month - 1, 26)
    to_date = date(year, month, 25)
    return from_date, to_date


def get_default_cycle():
    today = date.today()
    if today.day >= 26:
        m = today.month + 1
        y = today.year
        if m > 12:
            m = 1
            y += 1
    else:
        m = today.month
        y = today.year
    return get_attendance_cycle(m, y)


def get_attendance_code(att_status, leave_type, is_holiday, is_weekly_off):
    """Map attendance + holiday info to display code."""
    if att_status == "Present":
        if is_weekly_off:
            return "WO-P"
        if is_holiday:
            return "H-P"
        return "P"
    if att_status == "Absent":
        return "A"
    if att_status == "Half Day":
        return "HD"
    if att_status == "On Leave":
        lt = (leave_type or "").lower()
        if "casual" in lt:
            return "CL"
        if "sick" in lt:
            return "SiL"
        if "earned" in lt:
            return "EL"
        if "compensatory" in lt or "comp" in lt:
            return "CO"
        if "maternity" in lt:
            return "MatL"
        if "paternity" in lt:
            return "PatL"
        if "without" in lt or "lwp" in lt:
            return "LWP"
        return "L"
    if att_status == "Holiday":
        return "H"
    if att_status == "Weekly Off":
        return "WO"
    return ""


def execute(filters=None):
    filters = filters or {}

    # Determine date range
    if filters.get("from_date") and filters.get("to_date"):
        from_date = getdate(filters.get("from_date"))
        to_date = getdate(filters.get("to_date"))
    elif filters.get("month"):
        month = int(filters.get("month"))
        year = int(filters.get("year", date.today().year))
        from_date, to_date = get_attendance_cycle(month, year)
    else:
        from_date, to_date = get_default_cycle()

    if to_date < from_date:
        frappe.throw("To Date cannot be before From Date")

    # Generate date columns
    date_cols = []
    d = from_date
    while d <= to_date:
        date_cols.append(d)
        d += timedelta(days=1)

    # ---- Build Columns ----
    columns = [
        {"label": "Employee Code", "fieldname": "employee", "fieldtype": "Link", "options": "Employee", "width": 110},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 170},
        {"label": "State", "fieldname": "custom_state", "fieldtype": "Data", "width": 90},
        {"label": "Business Unit", "fieldname": "custom_division", "fieldtype": "Data", "width": 110},
        {"label": "Zone", "fieldname": "custom_zone", "fieldtype": "Data", "width": 90},
        {"label": "Region", "fieldname": "custom_region", "fieldtype": "Data", "width": 90},
        {"label": "District", "fieldname": "custom_district", "fieldtype": "Data", "width": 100},
        {"label": "Branch Name", "fieldname": "branch", "fieldtype": "Data", "width": 140},
        {"label": "Date of Joining", "fieldname": "date_of_joining", "fieldtype": "Date", "width": 100},
        {"label": "Relieving Date", "fieldname": "relieving_date", "fieldtype": "Date", "width": 100},
        {"label": "Shift", "fieldname": "default_shift", "fieldtype": "Data", "width": 80},
        {"label": "Reporting Manager", "fieldname": "reports_to", "fieldtype": "Data", "width": 130},
        {"label": "Manager Name", "fieldname": "reports_to_name", "fieldtype": "Data", "width": 150},
    ]

    for d in date_cols:
        columns.append({
            "label": d.strftime("%d %b"),
            "fieldname": d.strftime("%d_%m_%Y"),
            "fieldtype": "Data",
            "width": 60,
        })

    columns.append({"label": "Total Days", "fieldname": "total_days", "fieldtype": "Int", "width": 80})
    columns.append({"label": "Total Present", "fieldname": "total_present", "fieldtype": "Float", "width": 100})
    columns.append({"label": "Total Absent", "fieldname": "total_absent", "fieldtype": "Float", "width": 100})

    # ---- Fetch Employees ----
    emp_conditions = "AND e.custom_is_support_staff = 1"
    if filters.get("employee"):
        emp_conditions += " AND e.name = %(employee)s"
    if filters.get("branch"):
        emp_conditions += " AND e.branch = %(branch)s"
    if filters.get("department"):
        emp_conditions += " AND e.department = %(department)s"

    _state_select = ", e.custom_state" if "custom_state" in {r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`")} else ""

    employees = frappe.db.sql(f"""
        SELECT e.name, e.employee_name, e.branch, e.department, e.designation,
               e.date_of_joining, e.relieving_date, e.custom_zone, e.custom_region, e.custom_district,
               e.sahayog_branch, e.reports_to, e.default_shift, e.custom_division,
               e.holiday_list
               {_state_select}
        FROM `tabEmployee` e
        WHERE e.custom_is_support_staff = 1 {emp_conditions}
        ORDER BY CAST(REGEXP_REPLACE(e.name, '[^0-9]', '') AS UNSIGNED), e.name
    """, filters, as_dict=True)

    if not employees:
        return columns, []

    emp_names = [e.name for e in employees]

    # Fetch reporting manager names
    rt_names = {}
    for e in employees:
        if e.reports_to:
            rt_names[e.reports_to] = None
    if rt_names:
        for rt in frappe.db.sql("SELECT name, employee_name FROM `tabEmployee` WHERE name IN %(rts)s",
                                 {"rts": list(rt_names.keys())}, as_dict=True):
            rt_names[rt.name] = rt.employee_name

    # ---- Fetch Attendance Records ----
    attendances = frappe.db.sql("""
        SELECT a.employee, a.attendance_date, a.status, a.leave_type
        FROM `tabAttendance` a
        WHERE a.employee IN %(employees)s
          AND a.attendance_date BETWEEN %(from_date)s AND %(to_date)s
          AND a.docstatus = 1
    """, {
        "employees": emp_names,
        "from_date": from_date,
        "to_date": to_date,
    }, as_dict=True)

    att_map = {}
    for a in attendances:
        key = f"{a.employee}|{a.attendance_date}"
        att_map[key] = a

    # ---- Fetch Approved Regularizations (On Duty) ----
    corrections = frappe.db.sql("""
        SELECT ac.employee, ac.attendance_date
        FROM `tabAttendance Correction` ac
        WHERE ac.employee IN %(employees)s
          AND ac.attendance_date BETWEEN %(from_date)s AND %(to_date)s
          AND ac.status = 'Approved'
    """, {
        "employees": emp_names,
        "from_date": from_date,
        "to_date": to_date,
    }, as_dict=True)

    od_keys = {f"{c.employee}|{c.attendance_date}" for c in corrections}

    # ---- Fetch Holiday Lists ----
    # Collect unique holiday lists
    hl_names = list(set(e.holiday_list for e in employees if e.holiday_list))
    holiday_dates = set()
    weekly_off_dates = set()
    holidays = []

    if hl_names:
        holidays = frappe.db.sql("""
            SELECT parent, holiday_date, weekly_off
            FROM `tabHoliday`
            WHERE parent IN %(hl)s
              AND holiday_date BETWEEN %(from)s AND %(to)s
        """, {"hl": hl_names, "from": from_date, "to": to_date}, as_dict=True)
        for h in holidays:
            if h.weekly_off:
                weekly_off_dates.add(h.holiday_date)
            else:
                holiday_dates.add(h.holiday_date)

    # Build employee-wise holiday/weekly-off lookup per date
    # For simplicity: if date is in any holiday list, treat as holiday/weekly off
    # More precise: check employee's own holiday list
    emp_holiday_lists = {e.name: e.holiday_list for e in employees if e.holiday_list}

    # Build per-employee holiday/weekly-off sets
    emp_holiday_map = {}
    emp_wo_map = {}
    for ename, hl in emp_holiday_lists.items():
        emp_holiday_map[ename] = set()
        emp_wo_map[ename] = set()
    for h in holidays:
        for ename, hl in emp_holiday_lists.items():
            if hl == h.parent:
                if h.weekly_off:
                    emp_wo_map[ename].add(h.holiday_date)
                else:
                    emp_holiday_map[ename].add(h.holiday_date)
    # Employees without holiday list use the global sets
    global_holidays = set()
    global_wo = set()
    for h in holidays:
        if h.weekly_off:
            global_wo.add(h.holiday_date)
        else:
            global_holidays.add(h.holiday_date)

    # Batch-fetch state from Sahayog Branch
    branch_codes = list(set(e.sahayog_branch for e in employees if e.sahayog_branch))
    branch_state_map = {}
    if branch_codes:
        for b in frappe.db.sql("SELECT name, state FROM `tabSahayog Branch` WHERE name IN %(bcs)s",
                                {"bcs": branch_codes}, as_dict=True):
            branch_state_map[b.name] = b.state or ""

    # Check if Employee table has a custom_state column
    _emp_cols = {r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`")}
    has_emp_state = "custom_state" in _emp_cols

    # ---- Build Data Rows ----
    data = []
    for emp in employees:
        row = {
            "employee": emp.name,
            "employee_name": emp.employee_name,
            "custom_state": branch_state_map.get(emp.sahayog_branch, "") or (emp.custom_state if has_emp_state else ""),
            "custom_division": emp.custom_division,
            "custom_zone": emp.custom_zone,
            "custom_region": emp.custom_region,
            "custom_district": emp.custom_district,
            "branch": emp.branch,
            "date_of_joining": emp.date_of_joining,
            "relieving_date": emp.relieving_date,
            "default_shift": emp.default_shift,
            "reports_to": emp.reports_to,
            "reports_to_name": rt_names.get(emp.reports_to, ""),
        }

        total_days = 0
        total_present = 0
        total_absent = 0

        for d in date_cols:
            key = f"{emp.name}|{d}"
            att = att_map.get(key)

            # Determine holiday/weekly-off status
            ehl = emp_holiday_map.get(emp.name, global_holidays)
            ewo = emp_wo_map.get(emp.name, global_wo)
            is_hol = d in ehl
            is_wo = d in ewo or d.weekday() == 6

            if att:
                # Approved regularization -> On Duty (OD), counted as Present
                is_od = att.status == "Present" and key in od_keys
                if is_od:
                    code = "OD"
                    total_present += 1
                else:
                    code = get_attendance_code(att.status, att.leave_type, is_hol, is_wo)
                    if att.status == "Present":
                        total_present += 1
                    elif att.status == "Half Day":
                        total_present += 0.5
                    elif att.status == "Absent":
                        total_absent += 1
                total_days += 1
            else:
                if is_hol:
                    code = "H"
                    total_present += 1
                elif is_wo:
                    code = "WO"
                    total_present += 1
                else:
                    code = "A"
                    total_absent += 1

            row[d.strftime("%d_%m_%Y")] = code

        row["total_days"] = total_days
        row["total_present"] = flt(total_present, 1)
        row["total_absent"] = flt(total_absent, 1)
        data.append(row)

    return columns, data
