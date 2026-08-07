import frappe
from frappe import _
from frappe.utils import nowdate, nowtime, getdate, add_days

@frappe.whitelist(allow_guest=False)
def get_team_attendance_data(employee_status="Active"):
    """Fetch all employees reporting to the logged-in user and their today's attendance status in bulk.
    employee_status: 'Active', 'Left', or 'all' (HR only)."""
    user = frappe.session.user
    
    # Ensure only logged in users can access
    if user == "Guest":
        frappe.throw(_("Please login to access this portal"), frappe.PermissionError)
    
    # Get current user's employee record and roles
    roles = frappe.get_roles(user)
    manager = frappe.db.get_value("Employee", {"user_id": user}, ["name", "employee_name", "sahayog_branch", "sol_id", "custom_is_support_staff"], as_dict=True)
    
    # Access Control: Only HR, Branch Manager, Admin, or Support Staff can access
    is_authorized_manager = any(r in roles for r in ["HR Manager", "HR User", "Branch Manager", "Administrator"])
    is_support_staff = manager.custom_is_support_staff if manager else False
    
    if not (is_authorized_manager or is_support_staff):
        frappe.throw(_("Access denied. This portal is only for support staff and authorized managers."), frappe.PermissionError)

    if not manager and user != "Administrator":
        return {"error": True, "message": "Manager Employee record not found."}

    status_counts = {}

    if "HR Manager" in roles or "HR User" in roles or user == "Administrator":
        # HR/Admin gets everything except themselves
        base_filter = {"user_id": ["!=", user], "custom_is_support_staff": 1}
        # Status counts for filter tabs — use SQL for reliability
        count_result = frappe.db.sql("""
            SELECT 
                SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'Left' THEN 1 ELSE 0 END) as left_count,
                COUNT(*) as all_count
            FROM `tabEmployee`
            WHERE (user_id != %s OR user_id IS NULL) AND custom_is_support_staff = 1
        """, (user,), as_dict=True)
        if count_result:
            status_counts = {
                "Active": count_result[0].active,
                "Left": count_result[0].left_count,
                "All": count_result[0].all_count,
            }
        # Apply requested status filter
        if employee_status == "all":
            filters = base_filter
        else:
            filters = {**base_filter, "status": employee_status}
    elif "Branch Manager" in roles:
        # Branch Managers manage all active staff in their branch (using sahayog_branch/sol_id)
        branch_id = manager.sahayog_branch or manager.sol_id
        if branch_id:
            filters = {"sahayog_branch": branch_id, "status": "Active", "user_id": ["!=", user], "custom_is_support_staff": 1}
        else:
            # Fallback to reports_to if branch not set (for safety)
            filters = {"reports_to": manager.name, "status": "Active", "user_id": ["!=", user], "custom_is_support_staff": 1}
    else:
        # Regular employees only manage themselves
        filters = {"name": manager.name} if manager else {"user_id": user}

    # Fetch team members
    team = frappe.get_all("Employee", 
        filters=filters,
        fields=[
            "name", "employee_name", "designation", "branch", "sahayog_branch", "sol_id", "status", 
            "gender", "image", "department", "date_of_joining", 
            "reports_to", "cell_number", "company_email",
            "relieving_date", "resignation_letter_date", "reason_for_leaving"
        ],
        order_by="modified desc"
    )
    
    if not team:
        return {"team": [], "summary": {"total": 0, "present": 0, "absent": 0, "half_day": 0, "pending": 0, "on_leave": 0}, "current_user": manager, "roles": roles, "status_counts": status_counts}

    emp_names = [emp.name for emp in team]
    today = nowdate()
    
    attendance_map = {}
    checkin_map = {}
    on_leave_emps = set()

    # Only fetch attendance/checkin data for Active employees
    if employee_status in ("Active", "all"):
        # 1. Bulk Fetch Attendance
        attendances = frappe.get_all("Attendance",
            filters={"employee": ["in", emp_names], "attendance_date": today},
            fields=["employee", "status"]
        )
        attendance_map = {att.employee: att.status for att in attendances}
        
        # 2. Bulk Fetch Check-ins
        checkins = frappe.get_all("Employee Checkin",
            filters={"employee": ["in", emp_names], "time": ["between", [today + " 00:00:00", today + " 23:59:59"]]},
            fields=["employee", "time", "log_type"],
            order_by="time asc"
        )
        for c in checkins:
            if c.employee not in checkin_map:
                checkin_map[c.employee] = {"in": None, "out": None}
            if c.log_type == "IN" and not checkin_map[c.employee]["in"]:
                checkin_map[c.employee]["in"] = frappe.utils.format_time(c.time, "HH:mm")
            elif c.log_type == "OUT":
                checkin_map[c.employee]["out"] = frappe.utils.format_time(c.time, "HH:mm")

        # 3. Bulk Fetch Approved Leaves
        leaves = frappe.get_all("Leave Application",
            filters={
                "employee": ["in", emp_names],
                "status": "Approved",
                "from_date": ["<=", today],
                "to_date": [">=", today]
            },
            fields=["employee"]
        )
        on_leave_emps = set(l.employee for l in leaves)

    # 4. Fetch supervisor names
    supervisor_ids = list(set([emp.reports_to for emp in team if emp.reports_to]))
    supervisor_map = {}
    if supervisor_ids:
        supervisors = frappe.get_all("Employee", 
            filters={"name": ["in", supervisor_ids]}, 
            fields=["name", "employee_name"])
        supervisor_map = {s.name: s.employee_name for s in supervisors}
    
    # Process
    present_count = absent_count = half_day_count = pending_count = on_leave_count = 0

    for emp in team:
        emp.reports_to_name = supervisor_map.get(emp.reports_to)
        emp.is_self = (emp.name == manager.name) if manager else False
        
        if emp.status == "Left":
            emp.attendance_status = None
            emp.check_in = None
            emp.check_out = None
        else:
            # Determine Status
            status = attendance_map.get(emp.name)
            c_logs = checkin_map.get(emp.name)
            
            emp.check_in = c_logs["in"] if c_logs else None
            emp.check_out = c_logs["out"] if c_logs else None
            
            if not status and c_logs and c_logs["in"]:
                status = "Present"
            
            if not status and emp.name in on_leave_emps:
                status = "On Leave"
                
            emp.attendance_status = status
            
            if status == "Present": present_count += 1
            elif status == "Absent": absent_count += 1
            elif status == "Half Day": half_day_count += 1
            elif status == "On Leave": on_leave_count += 1
            else: pending_count += 1

    allow_hr_to_mark = frappe.db.get_single_value("Sahayog HR Setting", "allow_hr_to_mark_attendance") or 0

    return {
        "team": team,
        "summary": {
            "total": len(team),
            "present": present_count,
            "absent": absent_count,
            "half_day": half_day_count,
            "pending": pending_count,
            "on_leave": on_leave_count
        },
        "current_user": manager,
        "roles": roles,
        "status_counts": status_counts,
        "allow_hr_to_mark_attendance": allow_hr_to_mark
    }

@frappe.whitelist()
def get_hr_dashboard_data(month=None):
    """Fetch global metrics for HR Dashboard (Module 7)."""
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    if "HR Manager" not in roles and "HR User" not in roles and user != "Administrator":
        frappe.throw(_("Not authorized to view HR Dashboard"), frappe.PermissionError)
        
    from frappe.utils import get_first_day, get_last_day, getdate, nowdate
    
    today = nowdate()
    if not month:
        month = today[:7] # YYYY-MM
    
    first_day = get_first_day(month + "-01")
    last_day = get_last_day(first_day)
    is_current_month = (month == today[:7])
    
    # 1. Headcount & Lifecycle
    headcount = frappe.db.count("Employee", {"status": "Active", "custom_is_support_staff": 1})
    
    lifecycle = {
        "new_joinees": frappe.db.count("Employee", {"date_of_joining": ["between", [first_day, last_day]], "custom_is_support_staff": 1}),
        "resigned": frappe.db.count("Employee", {"status": ["in", ["Left", "Resigned"]], "relieving_date": ["between", [first_day, last_day]], "custom_is_support_staff": 1}),
        "permanent": frappe.db.count("Employee", {"status": "Active", "employment_type": "Permanent", "custom_is_support_staff": 1}),
        "probation": frappe.db.count("Employee", {"status": "Active", "employment_type": "Probation", "custom_is_support_staff": 1})
    }

    # 2. Detailed Attendance Summary
    attendance_summary = {
        "Present": 0, "Absent": 0, "Half Day": 0, "On Leave": 0
    }
    
    if is_current_month:
        # Today's Snapshot
        att_raw = frappe.db.sql("""
            SELECT a.status, count(*) as count 
            FROM `tabAttendance` a
            JOIN `tabEmployee` e ON a.employee = e.name
            WHERE a.attendance_date = %s 
              AND e.custom_is_support_staff = 1
            GROUP BY a.status
        """, (today), as_dict=True)
        
        raw_counts = {}
        for a in att_raw:
            raw_counts[a.status] = a.count
            if a.status in attendance_summary:
                attendance_summary[a.status] = a.count
                
        total_marked = sum(raw_counts.values())
        not_marked = max(0, headcount - total_marked)
        attendance_summary["Not Marked"] = not_marked
        
        eff_present = raw_counts.get("Present", 0) + (raw_counts.get("Half Day", 0) * 0.5) + raw_counts.get("Work From Home", 0)
        att_percentage = round((eff_present / headcount * 100), 2) if headcount > 0 else 0

        # Actionable: Not marked today
        marked_employees = frappe.get_all("Attendance", 
            filters={"attendance_date": today, "docstatus": ["<", 2]}, 
            pluck="employee"
        )
        alert_list = frappe.get_all("Employee",
            filters={"name": ["not in", marked_employees], "status": "Active", "custom_is_support_staff": 1},
            fields=["name", "employee_name", "sahayog_branch", "designation"],
            limit=15
        )
        alert_title = "🚨 Attendance Not Marked Today"
        working_days = 1
    else:
        # Monthly Averages
        working_days = frappe.db.sql("""
            SELECT count(distinct attendance_date) 
            FROM `tabAttendance` 
            WHERE attendance_date BETWEEN %s AND %s
        """, (first_day, last_day))[0][0] or 1
        
        att_raw = frappe.db.sql("""
            SELECT a.status, count(*) as total_count 
            FROM `tabAttendance` a
            JOIN `tabEmployee` e ON a.employee = e.name
            WHERE a.attendance_date BETWEEN %s AND %s 
              AND e.custom_is_support_staff = 1
            GROUP BY a.status
        """, (first_day, last_day), as_dict=True)
        
        for a in att_raw:
            if a.status in attendance_summary:
                attendance_summary[a.status] = round(a.total_count / working_days, 1)
        
        attendance_summary["Not Marked"] = "N/A"
        
        total_eff_present = frappe.db.sql("""
            SELECT SUM(CASE WHEN a.status IN ('Present', 'Work From Home') THEN 1 WHEN a.status = 'Half Day' THEN 0.5 ELSE 0 END)
            FROM `tabAttendance` a
            JOIN `tabEmployee` e ON a.employee = e.name
            WHERE a.attendance_date BETWEEN %s AND %s AND e.custom_is_support_staff = 1
        """, (first_day, last_day))[0][0] or 0
        
        total_possible = headcount * working_days
        att_percentage = round((total_eff_present / total_possible * 100), 2) if total_possible > 0 else 0
        
        # Actionable: Frequent Absentees (More than 2 absents)
        alert_list = frappe.db.sql("""
            SELECT e.name, e.employee_name, e.sahayog_branch, e.designation, COUNT(a.name) as absent_count
            FROM `tabEmployee` e
            JOIN `tabAttendance` a ON e.name = a.employee 
            WHERE e.custom_is_support_staff = 1 
              AND e.status = 'Active' 
              AND a.attendance_date BETWEEN %s AND %s 
              AND a.status = 'Absent'
            GROUP BY e.name
            HAVING absent_count > 2
            ORDER BY absent_count DESC
            LIMIT 15
        """, (first_day, last_day), as_dict=True)
        alert_title = "📉 Frequent Absentees (Month)"

    # 3. Leave Summary
    leave_statuses = frappe.db.sql("""
        SELECT l.status, count(*) as count 
        FROM `tabLeave Application` l
        JOIN `tabEmployee` e ON l.employee = e.name
        WHERE l.from_date >= %s AND l.to_date <= %s
          AND e.custom_is_support_staff = 1
        GROUP BY l.status
    """, (first_day, last_day), as_dict=True)
    
    leave_summary = {
        "Approved": 0, "Open": 0, "Rejected": 0,
        "by_type": [], "by_branch": []
    }
    for ls in leave_statuses:
        if ls.status == "Approved": leave_summary["Approved"] = ls.count
        elif ls.status == "Open": leave_summary["Open"] = ls.count
        elif ls.status == "Rejected": leave_summary["Rejected"] = ls.count

    leave_summary["by_type"] = frappe.db.sql("""
        SELECT l.leave_type, count(*) as count 
        FROM `tabLeave Application` l
        JOIN `tabEmployee` e ON l.employee = e.name
        WHERE l.from_date >= %s AND l.to_date <= %s
          AND e.custom_is_support_staff = 1
        GROUP BY l.leave_type
    """, (first_day, last_day), as_dict=True)

    leave_summary["by_branch"] = frappe.db.sql("""
        SELECT e.sahayog_branch as branch, count(l.name) as count 
        FROM `tabLeave Application` l
        JOIN `tabEmployee` e ON l.employee = e.name
        WHERE l.from_date >= %s AND l.to_date <= %s
          AND e.custom_is_support_staff = 1
        GROUP BY e.sahayog_branch
    """, (first_day, last_day), as_dict=True)

    # 4. Branch-wise Performance
    branch_data = frappe.db.sql("""
        SELECT e.sahayog_branch as branch, sb.branch as branch_name, count(*) as total 
        FROM `tabEmployee` e
        LEFT JOIN `tabSahayog Branch` sb ON e.sahayog_branch = CAST(sb.name AS CHAR)
        WHERE e.status = 'Active' AND e.custom_is_support_staff = 1
        GROUP BY e.sahayog_branch
    """, as_dict=True)
    
    if is_current_month:
        attendance_by_branch = frappe.db.sql("""
            SELECT e.sahayog_branch as branch, count(*) as count
            FROM `tabAttendance` a
            JOIN `tabEmployee` e ON a.employee = e.name
            WHERE a.attendance_date = %s 
              AND a.status IN ('Present', 'Work From Home')
              AND a.docstatus < 2
              AND e.custom_is_support_staff = 1
            GROUP BY e.sahayog_branch
        """, (today,), as_dict=True)
        att_map = {b.branch: b.count for b in attendance_by_branch if b.branch}
        for b in branch_data:
            b.present = att_map.get(b.branch, 0)
            b.att_pc = round((b.present / b.total * 100), 2) if b.total > 0 else 0
    else:
        branch_att = frappe.db.sql("""
            SELECT e.sahayog_branch as branch, 
                   SUM(CASE WHEN a.status IN ('Present', 'Work From Home') THEN 1 WHEN a.status = 'Half Day' THEN 0.5 ELSE 0 END) as total_present
            FROM `tabAttendance` a
            JOIN `tabEmployee` e ON a.employee = e.name
            WHERE a.attendance_date BETWEEN %s AND %s AND e.custom_is_support_staff = 1
            GROUP BY e.sahayog_branch
        """, (first_day, last_day), as_dict=True)
        att_map = {b.branch: b.total_present for b in branch_att if b.branch}
        for b in branch_data:
            possible = b.total * working_days
            b.present = round(att_map.get(b.branch, 0) / working_days, 1)
            b.att_pc = round((att_map.get(b.branch, 0) / possible * 100), 2) if possible > 0 else 0

    return {
        "month": month,
        "is_current_month": is_current_month,
        "headcount": headcount,
        "lifecycle": lifecycle,
        "attendance": {
            "summary": attendance_summary,
            "percentage": att_percentage
        },
        "leaves": leave_summary,
        "branch_wise": branch_data,
        "alert_list": alert_list,
        "alert_title": alert_title,
        "pending_requests": {
            "leaves": leave_summary["Open"],
            "corrections": frappe.db.count("Attendance Correction", {"status": "Pending"})
        }
    }

@frappe.whitelist()
def mark_attendance(employee, status, log_type=None, force=False):
    """
    Mark attendance or checkin for an employee.
    status: 'Present', 'Absent', 'Half Day'
    log_type: 'IN', 'OUT' (used when status is Present)
    force: if True, allows marking attendance on holidays (after user confirmation)
    """
    if not employee or not status:
        frappe.throw(_("Employee and Status are required"))

    # Normalize force param (comes as string from API call)
    if isinstance(force, str):
        force = force.lower() in ("true", "1", "yes")
    else:
        force = bool(force)

    today = nowdate()

    # Check if today is a holiday — return warning instead of hard block
    holiday_dates = _get_employee_holiday_dates(employee, today, today)
    if today in holiday_dates and not force:
        desc = holiday_dates[today]
        return {
            "success": False,
            "is_holiday": True,
            "holiday_name": desc,
            "message": "Today is a holiday: {0}".format(desc)
        }

    if status == "Present":
        # Create Employee Checkin record
        checkin = frappe.get_doc({
            "doctype": "Employee Checkin",
            "employee": employee,
            "time": frappe.utils.now_datetime(),
            "log_type": log_type or "IN",
            "device_id": "Portal"
        })
        checkin.insert(ignore_permissions=True)
        
        # Create Attendance record (if it doesn't exist)
        if not frappe.db.exists("Attendance", {"employee": employee, "attendance_date": today}):
            att = frappe.get_doc({
                "doctype": "Attendance",
                "employee": employee,
                "attendance_date": today,
                "status": "Present",
                "company": frappe.db.get_value("Employee", employee, "company")
            })
            att.insert(ignore_permissions=True)
            att.submit()
            
        return {"success": True, "message": "Check In and Marked Present"}

    elif status in ["Absent", "Half Day"]:
        # Create Attendance record
        if frappe.db.exists("Attendance", {"employee": employee, "attendance_date": today}):
            frappe.throw(_("Attendance already marked for today"))
            
        att = frappe.get_doc({
            "doctype": "Attendance",
            "employee": employee,
            "attendance_date": today,
            "status": status,
            "company": frappe.db.get_value("Employee", employee, "company")
        })
        att.insert(ignore_permissions=True)
        att.submit()
        return {"success": True, "message": f"Marked as {status}"}

@frappe.whitelist()
def request_attendance_correction(employee, attendance_date, requested_status, reason):
    """Create an Attendance Correction request from the portal."""
    if not employee or not attendance_date or not requested_status or not reason:
        frappe.throw(_("All fields are required"))

    # Check if a pending request already exists for this date and employee
    existing = frappe.db.exists("Attendance Correction", {
        "employee": employee,
        "attendance_date": attendance_date,
        "status": ["in", ["Draft", "Pending"]]
    })
    if existing:
        frappe.throw(_("A correction request for this date is already pending."))

    # Get current status
    current_status = frappe.db.get_value("Attendance", {
        "employee": employee,
        "attendance_date": attendance_date
    }, "status")

    if not current_status:
        # Check if it was On Leave
        leave = frappe.get_all("Leave Application", filters={
            "employee": employee,
            "status": "Approved",
            "from_date": ["<=", attendance_date],
            "to_date": [">=", attendance_date]
        })
        if leave:
            current_status = "On Leave"

    doc = frappe.get_doc({
        "doctype": "Attendance Correction",
        "employee": employee,
        "attendance_date": attendance_date,
        "current_status": current_status or "Not Marked",
        "requested_status": requested_status,
        "reason": reason,
        "requested_by": frappe.session.user,
        "status": "Pending"
    })
    doc.insert(ignore_permissions=True)
    
    return {"success": True, "message": _("Correction request submitted for approval")}

@frappe.whitelist()
def get_pending_attendance_corrections():
    """Fetch pending and historical attendance correction requests for the manager's branch or all for HR/Admin."""
    user = frappe.session.user
    roles = frappe.get_roles(user)

    # Get current manager's branch info
    emp_data = frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, ["name", "sahayog_branch", "sol_id"], as_dict=True)

    filters = {}

    # If Admin or HR, filter by support staff
    if "HR Manager" in roles or "HR User" in roles or "Administrator" in roles:
        support_staff = frappe.get_all("Employee", filters={"custom_is_support_staff": 1}, fields=["name"])
        filters["employee"] = ["in", [s.name for s in support_staff]]

    # If not Admin or HR, filter by branch staff
    if "HR Manager" not in roles and "HR User" not in roles and "Administrator" not in roles:
        if "Branch Manager" in roles and emp_data:
            branch_id = emp_data.sahayog_branch or emp_data.sol_id
            if branch_id:
                # Get all employees in the branch
                branch_staff = frappe.get_all("Employee", filters={"sahayog_branch": branch_id, "custom_is_support_staff": 1}, fields=["name"])
                staff_names = [s.name for s in branch_staff]
                filters["employee"] = ["in", staff_names]
            else:
                # Fallback to direct reports if branch is missing
                subordinates = frappe.get_all("Employee", filters={"reports_to": emp_data.name, "custom_is_support_staff": 1}, fields=["name"])
                filters["employee"] = ["in", [s.name for s in subordinates]]
        else:
            return {"pending": [], "history": []}

    corrections = frappe.get_all("Attendance Correction",
        filters=filters,
        fields=["name", "employee", "employee_name", "attendance_date", "current_status", "requested_status", "reason", "requested_by", "status", "creation"],
        order_by="creation desc"
    )

    pending = [c for c in corrections if c.status == "Pending"]
    history = [c for c in corrections if c.status != "Pending"]

    return {"pending": pending, "history": history}

@frappe.whitelist()
def approve_attendance_correction(request_id, action="Approved"):
    """Approve or Reject an attendance correction request from the portal."""
    if not request_id:
        frappe.throw(_("Request ID is required"))
        
    doc = frappe.get_doc("Attendance Correction", request_id)
    
    if doc.status != "Pending":
        frappe.throw(_("This request is already {0}").format(doc.status))
        
    doc.status = action
    doc.approved_by = frappe.session.user
    doc.approval_date = frappe.utils.now_datetime()
    doc.save(ignore_permissions=True)
    
    # apply_correction is called inside on_update of the DocType
    
    return {"success": True, "message": _("Request {0} successfully").format(action)}

def _get_employee_holiday_dates(employee, from_date, to_date):
    """Return dict {date: description} of holidays for an employee within date range."""
    holiday_list = frappe.db.get_value("Employee", employee, "holiday_list")
    if not holiday_list:
        company = frappe.db.get_value("Employee", employee, "company")
        if company:
            holiday_list = frappe.db.get_value("Company", company, "default_holiday_list")
    if not holiday_list:
        return {}

    holidays = frappe.db.sql("""
        SELECT holiday_date, description FROM `tabHoliday`
        WHERE parent = %(hl)s
          AND holiday_date BETWEEN %(from)s AND %(to)s
          AND weekly_off = 0
    """, {"hl": holiday_list, "from": from_date, "to": to_date}, as_dict=True)
    import re
    return {str(h.holiday_date): re.sub(r'<[^>]+>', '', h.description or '').strip() for h in holidays}

@frappe.whitelist()
def get_employee_calendar(employee, month, year):
    """Fetch attendance and leave history for a specific employee and month."""
    from calendar import monthrange
    
    first_day = f"{year}-{month}-01"
    last_day = f"{year}-{month}-{monthrange(int(year), int(month))[1]}"
    
    # Fetch Attendance
    attendances = frappe.get_all("Attendance",
        filters={
            "employee": employee,
            "attendance_date": ["between", [first_day, last_day]]
        },
        fields=["attendance_date", "status"]
    )
    
    # Fetch Leaves
    leaves = frappe.get_all("Leave Application",
        filters={
            "employee": employee,
            "status": "Approved",
            "from_date": ["<=", last_day],
            "to_date": [">=", first_day]
        },
        fields=["from_date", "to_date", "leave_type"]
    )
    
    # Format for easy frontend mapping
    history = {str(att.attendance_date): att.status for att in attendances}
    
    # Add pending correction requests
    corrections = frappe.get_all("Attendance Correction",
        filters={
            "employee": employee,
            "attendance_date": ["between", [first_day, last_day]],
            "status": "Pending"
        },
        fields=["attendance_date"]
    )
    for corr in corrections:
        date_str = str(corr.attendance_date)
        if date_str not in history:
            history[date_str] = "Pending Correction"
        else:
            history[date_str] = f"{history[date_str]} (Correction Pending)"
    
    # Add leave days
    for leave in leaves:
        start = getdate(leave.from_date)
        end = getdate(leave.to_date)
        curr = start
        while curr <= end:
            history[str(curr)] = "On Leave"
            curr = add_days(curr, 1)

    # Add holiday dates (only if no attendance/leave already marked)
    holiday_info = _get_employee_holiday_dates(employee, first_day, last_day)
    for hd, desc in holiday_info.items():
        ds = str(hd)
        if ds not in history:
            history[ds] = f"Holiday: {desc}"
            
    return history

@frappe.whitelist(allow_guest=False)
def get_leave_balances(employee):
    """Fetch leave balances for the given employee."""
    from frappe.utils import today
    
    # Fetch active leave allocations (valid for today's date)
    allocations = frappe.get_all("Leave Allocation",
        filters={
            "employee": employee, 
            "docstatus": 1,
            "from_date": ["<=", today()],
            "to_date": [">=", today()]
        },
        fields=["name", "leave_type", "total_leaves_allocated", "unused_leaves", 
                "carry_forwarded_leaves_count", "from_date", "to_date"]
    )

    for alloc in allocations:
        # Calculate used leaves ONLY within the allocation period
        total_used = frappe.db.sql("""
            SELECT COALESCE(SUM(total_leave_days), 0)
            FROM `tabLeave Application`
            WHERE employee = %s
              AND leave_type = %s
              AND status = 'Approved'
              AND docstatus = 1
              AND from_date >= %s
              AND to_date <= %s
        """, (employee, alloc.leave_type, alloc.from_date, alloc.to_date))[0][0] or 0

        # Recalculate accurate balance
        alloc.unused_leaves = alloc.total_leaves_allocated - total_used
        
        # Remove internal fields not needed in frontend
        alloc.pop("from_date", None)
        alloc.pop("to_date", None)
        alloc.pop("name", None)

    return allocations

@frappe.whitelist()
def get_attendance_dashboard(employee, from_date=None, to_date=None):
    """Fetch attendance summary for dashboard."""
    from frappe.utils import get_first_day, get_last_day, today
    
    if not from_date:
        from_date = get_first_day(today())
    if not to_date:
        to_date = get_last_day(today())
        
    # Role-based validation
    user = frappe.session.user
    if user != "Administrator":
        roles = frappe.get_roles(user)
        if "HR Manager" not in roles and "HR User" not in roles:
            manager_data = frappe.db.get_value("Employee", {"user_id": user}, ["name", "sahayog_branch", "sol_id"], as_dict=True)
            manager_emp = manager_data.name if manager_data else None
            
            if employee != manager_emp:
                # 1. Check if it's a direct subordinate
                is_subordinate = frappe.db.exists("Employee", {"name": employee, "reports_to": manager_emp})
                
                # 2. Check if Branch Manager can see branch staff
                is_branch_staff = False
                if "Branch Manager" in roles and manager_data:
                    branch_id = manager_data.sahayog_branch or manager_data.sol_id
                    if branch_id:
                        emp_branch_data = frappe.db.get_value("Employee", employee, ["sahayog_branch", "sol_id"], as_dict=True)
                        if emp_branch_data and (emp_branch_data.sahayog_branch == branch_id or emp_branch_data.sol_id == branch_id):
                            is_branch_staff = True

                if not is_subordinate and not is_branch_staff:
                    frappe.throw(_("You are not authorized to view this employee's dashboard"), frappe.PermissionError)

    filters = {
        "employee": employee,
        "attendance_date": ["between", [from_date, to_date]],
        "docstatus": 1
    }
    
    attendances = frappe.get_all("Attendance", filters=filters, fields=["status"])
    
    present_days = len([a for a in attendances if a.status in ["Present", "Work From Home"]])
    absent_days = len([a for a in attendances if a.status == "Absent"])
    leave_days = len([a for a in attendances if a.status == "On Leave"])
    half_days = len([a for a in attendances if a.status == "Half Day"])
    
    attendance_marked = len(attendances)
    
    # Calculate Monthly Summary & Find Missing Dates
    from frappe.utils import getdate, add_days, formatdate
    curr = getdate(from_date)
    end = getdate(to_date)
    today_dt = getdate(today())
    if end > today_dt:
        end = today_dt
        
    marked_dates = set([str(a.attendance_date) for a in frappe.get_all("Attendance", filters={"employee": employee, "attendance_date": ["between", [from_date, to_date]], "docstatus": ["<", 2]}, fields=["attendance_date"])])
    
    working_days_count = 0
    missing_dates = []
    
    temp_curr = curr
    while temp_curr <= end:
        if temp_curr.weekday() != 6: # Exclude Sundays
            working_days_count += 1
            date_str = str(temp_curr)
            if date_str not in marked_dates:
                missing_dates.append(formatdate(temp_curr, "dd-MMM"))
        temp_curr = add_days(temp_curr, 1)

    missing_days = len(missing_dates)

    # Correction Requests
    corrections_data = frappe.get_all("Attendance Correction", filters={
        "employee": employee,
        "attendance_date": ["between", [from_date, to_date]]
    }, fields=["name", "attendance_date", "current_status", "requested_status", "reason", "status"])
    
    corr_stats = {
        "pending_count": len([c for c in corrections_data if c.status == "Pending"]),
        "approved_count": len([c for c in corrections_data if c.status == "Approved"]),
        "rejected_count": len([c for c in corrections_data if c.status == "Rejected"]),
        "pending": [c for c in corrections_data if c.status == "Pending"],
        "approved": [c for c in corrections_data if c.status == "Approved"],
        "rejected": [c for c in corrections_data if c.status == "Rejected"],
        "total": len(corrections_data)
    }

    # Leave Requests
    leaves_data = frappe.get_all("Leave Application", filters={
        "employee": employee,
        "from_date": ["between", [from_date, to_date]]
    }, fields=["name", "leave_type", "from_date", "to_date", "status", "total_leave_days", "description"])
    
    leave_stats = {
        "pending_count": len([l for l in leaves_data if l.status == "Open"]),
        "approved_count": len([l for l in leaves_data if l.status == "Approved"]),
        "rejected_count": len([l for l in leaves_data if l.status == "Rejected"]),
        "pending": [l for l in leaves_data if l.status == "Open"],
        "approved": [l for l in leaves_data if l.status == "Approved"],
        "rejected": [l for l in leaves_data if l.status == "Rejected"]
    }

    # Employee & Manager Info
    emp_info = frappe.db.get_value("Employee", employee, ["employee_name", "designation", "branch", "reports_to"], as_dict=True)
    reporting_to = {"name": _("Not Set"), "designation": ""}
    if emp_info.reports_to:
        rep_data = frappe.db.get_value("Employee", emp_info.reports_to, ["employee_name", "designation"], as_dict=True)
        if rep_data:
            reporting_to = {"name": rep_data.employee_name, "designation": rep_data.designation}

    attendance_percentage = 0
    if working_days_count > 0:
        # HR Reporting Logic: (Present + HalfDay*0.5) / Expected Working Days
        effective_present = present_days + (half_days * 0.5)
        attendance_percentage = round((effective_present / working_days_count) * 100, 2)
        
    return {
        "employee_info": {
            "name": emp_info.employee_name,
            "designation": emp_info.designation,
            "branch": emp_info.branch
        },
        "statistics": {
            "marked_days": attendance_marked,
            "present_days": present_days,
            "absent_days": absent_days,
            "leave_days": leave_days,
            "half_days": half_days,
            "attendance_percentage": attendance_percentage,
        },
        "monthly_summary": {
            "total_working": working_days_count,
            "marked": attendance_marked,
            "missing": missing_days,
            "missing_dates": missing_dates
        },
        "corrections": corr_stats,
        "leaves": leave_stats,
        "leave_balances": get_leave_balances(employee),
        "reporting_to": reporting_to
    }

@frappe.whitelist()
def upload_leave_allocations():
    """Upload Leave Allocation via CSV/JSON.
    Expects a file upload (CSV/Excel) with columns:
      Employee Code, Leave Type, From Date, To Date, New Leaves
    Or a JSON payload with same fields.
    """
    from frappe.utils.csvutils import read_csv_content
    from frappe.utils.xlsxutils import read_xlsx_file_from_attached_file

    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    file_doc = frappe.request.files.get("file")
    if not file_doc:
        frappe.throw(_("No file uploaded"))

    ext = file_doc.filename.rsplit(".", 1)[-1].lower() if "." in file_doc.filename else ""
    content = file_doc.read()

    if ext == "csv":
        rows = read_csv_content(content)
    elif ext in ("xlsx", "xls"):
        rows = read_xlsx_file_from_attached_file(frappe.get_doc({
            "doctype": "File",
            "file_name": file_doc.filename,
            "content": content,
        }))
    else:
        frappe.throw(_("Unsupported file format. Please upload CSV or XLSX"))

    if not rows or len(rows) < 2:
        frappe.throw(_("File is empty or has no data rows"))

    header = [h.strip().lower() for h in rows[0]]
    required = ["employee code", "leave type", "new leaves"]
    for req in required:
        if req not in header:
            frappe.throw(_("Missing required column: '{0}'. Found columns: {1}").format(req, ", ".join(header)))

    results = {"created": 0, "updated": 0, "errors": []}

    for i, row in enumerate(rows[1:], start=2):
        if not any(row):
            continue
        row_data = {}
        for j, col in enumerate(header):
            val = row[j].strip() if j < len(row) and row[j] else ""
            row_data[col] = val

        emp_code = row_data.get("employee code", "").strip()
        leave_type = row_data.get("leave type", "").strip()
        new_leaves = frappe.utils.flt(row_data.get("new leaves", 0))
        from_date = row_data.get("from date", "").strip()
        to_date = row_data.get("to date", "").strip()

        if not emp_code or not leave_type or new_leaves <= 0:
            results["errors"].append(f"Row {i}: Missing required fields (employee code, leave type, valid new leaves)")
            continue

        if not frappe.db.exists("Employee", emp_code):
            results["errors"].append(f"Row {i}: Employee '{emp_code}' not found")
            continue

        if not frappe.db.exists("Leave Type", leave_type):
            results["errors"].append(f"Row {i}: Leave Type '{leave_type}' not found")
            continue

        try:
            # Normalize dates to YYYY-MM-DD (template uses DD-MM-YYYY)
            try:
                from_date = str(getdate(from_date)) if from_date else ""
                to_date = str(getdate(to_date)) if to_date else ""
            except Exception as de:
                results["errors"].append(f"Row {i}: Invalid date format: {de}")
                continue

            # Determine allocation period
            if not from_date:
                from_date = frappe.utils.today()
            if not to_date:
                to_date = f"{frappe.utils.getdate(from_date).year}-12-31"
            elif getdate(to_date) < getdate(from_date):
                results["errors"].append(f"Row {i}: To Date ({to_date}) is before From Date ({from_date})")
                continue

            # Check for existing allocation
            existing = frappe.db.get_value("Leave Allocation", {
                "employee": emp_code,
                "leave_type": leave_type,
                "docstatus": 1,
                "from_date": ("<=", to_date),
                "to_date": (">=", from_date),
            }, "name")

            if existing:
                doc = frappe.get_doc("Leave Allocation", existing)
                doc.new_leaves_allocated = new_leaves
                doc.from_date = from_date
                doc.to_date = to_date
                try:
                    doc.save(ignore_permissions=True)
                    if doc.docstatus == 0:
                        doc.submit()
                except Exception:
                    # "Not allowed to change From Date after submission" —
                    # update the fields directly instead.
                    doc.db_set({
                        "new_leaves_allocated": new_leaves,
                        "from_date": from_date,
                        "to_date": to_date,
                    })
                results["updated"] += 1
            else:
                doc = frappe.get_doc({
                    "doctype": "Leave Allocation",
                    "employee": emp_code,
                    "leave_type": leave_type,
                    "from_date": from_date,
                    "to_date": to_date,
                    "new_leaves_allocated": new_leaves,
                    "carry_forward": 0,
                })
                doc.insert(ignore_permissions=True)
                doc.submit()
                results["created"] += 1
        except Exception as e:
            results["errors"].append(f"Row {i}: {str(e)}")

    return {
        "success": True,
        "message": _("Created: {0}, Updated: {1}, Errors: {2}").format(
            results["created"], results["updated"], len(results["errors"])
        ),
        "details": results,
    }
