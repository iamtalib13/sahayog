import frappe
from frappe import _
from frappe.utils import nowdate, nowtime, getdate, add_days

@frappe.whitelist(allow_guest=False)
def get_team_attendance_data():
    """Fetch all employees reporting to the logged-in user and their today's attendance status in bulk."""
    user = frappe.session.user
    
    # Ensure only logged in users can access
    if user == "Guest":
        frappe.throw(_("Please login to access this portal"), frappe.PermissionError)
    
    # Get current manager's employee record
    manager = frappe.db.get_value("Employee", {"user_id": user}, ["name", "employee_name"], as_dict=True)
    
    if not manager and user != "Administrator":
        return {"error": True, "message": "Manager Employee record not found."}

    # Differentiate logic based on roles
    roles = frappe.get_roles(user)
    
    if "HR Manager" in roles or "HR User" in roles or user == "Administrator":
        # HR/Admin gets everything
        filters = {"status": "Active"}
    elif "Branch Manager" in roles:
        # Branch Managers manage their team
        filters = {"reports_to": manager.name, "status": "Active"} if manager else {"status": "Active"}
    else:
        # Regular employees only manage themselves
        filters = {"name": manager.name} if manager else {"user_id": user}

    # Fetch team members
    team = frappe.get_all("Employee", 
        filters=filters,
        fields=[
            "name", "employee_name", "designation", "branch", "status", 
            "gender", "image", "department", "date_of_joining", 
            "reports_to", "cell_number", "company_email"
        ],
        order_by="employee_name"
    )
    
    if not team:
        return {"team": [], "summary": {"total": 0, "present": 0, "absent": 0, "half_day": 0, "pending": 0, "on_leave": 0}, "current_user": manager}

    emp_names = [emp.name for emp in team]
    today = nowdate()
    
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
    # Map to first IN and last OUT
    checkin_map = {}
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
        "roles": roles
    }

@frappe.whitelist()
def get_hr_dashboard_data():
    """Fetch global metrics for HR Dashboard (Module 7)."""
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    if "HR Manager" not in roles and "HR User" not in roles and user != "Administrator":
        frappe.throw(_("Not authorized to view HR Dashboard"), frappe.PermissionError)
        
    today = nowdate()
    from frappe.utils import get_first_day, get_last_day, getdate
    first_day = get_first_day(today)
    last_day = get_last_day(today)
    
    # 1. Headcount & Lifecycle
    headcount = frappe.db.count("Employee", {"status": "Active"})
    
    lifecycle = {
        "new_joinees": frappe.db.count("Employee", {"date_of_joining": ["between", [first_day, last_day]]}),
        "resigned": frappe.db.count("Employee", {"status": ["in", ["Left", "Resigned"]], "relieving_date": ["between", [first_day, last_day]]}),
        "retired": frappe.db.count("Employee", {"status": "Retired"}),
        "probation": frappe.db.count("Employee", {"status": "Active", "employment_type": "Probation"}) # Common employment_type usage
    }

    # 2. Detailed Attendance Summary Today
    att_raw = frappe.db.sql("""
        SELECT status, count(*) as count 
        FROM `tabAttendance` 
        WHERE attendance_date = %s 
        GROUP BY status
    """, (today), as_dict=True)
    
    attendance_summary = {
        "Present": 0, "Absent": 0, "Half Day": 0, "On Leave": 0, "Work From Home": 0
    }
    for a in att_raw:
        if a.status in attendance_summary:
            attendance_summary[a.status] = a.count
            
    total_marked = sum(attendance_summary.values())
    not_marked = max(0, headcount - total_marked)
    attendance_summary["Not Marked"] = not_marked
    
    # Global Attendance %
    working_days_count = frappe.db.count("Employee", {"status": "Active"})
    eff_present = attendance_summary["Present"] + (attendance_summary["Half Day"] * 0.5) + attendance_summary["Work From Home"]
    att_percentage = round((eff_present / working_days_count * 100), 2) if working_days_count > 0 else 0

    # 3. Leave Summary
    # Status Counts
    leave_statuses = frappe.db.sql("""
        SELECT status, count(*) as count 
        FROM `tabLeave Application` 
        WHERE from_date >= %s AND to_date <= %s
        GROUP BY status
    """, (first_day, last_day), as_dict=True)
    
    leave_summary = {
        "Approved": 0, "Open": 0, "Rejected": 0,
        "by_type": [],
        "by_branch": []
    }
    for ls in leave_statuses:
        if ls.status == "Approved": leave_summary["Approved"] = ls.count
        elif ls.status == "Open": leave_summary["Open"] = ls.count
        elif ls.status == "Rejected": leave_summary["Rejected"] = ls.count

    # By Type
    leave_summary["by_type"] = frappe.db.sql("""
        SELECT leave_type, count(*) as count 
        FROM `tabLeave Application` 
        WHERE from_date >= %s AND to_date <= %s
        GROUP BY leave_type
    """, (first_day, last_day), as_dict=True)

    # By Branch
    leave_summary["by_branch"] = frappe.db.sql("""
        SELECT e.branch, count(l.name) as count 
        FROM `tabLeave Application` l
        JOIN `tabEmployee` e ON l.employee = e.name
        WHERE l.from_date >= %s AND l.to_date <= %s
        GROUP BY e.branch
    """, (first_day, last_day), as_dict=True)

    # 4. Branch-wise Distribution & Attendance % per Branch
    branch_data = frappe.db.sql("""
        SELECT e.branch, count(e.name) as total,
               (SELECT count(*) FROM `tabAttendance` a WHERE a.branch = e.branch AND a.attendance_date = %s AND a.status IN ('Present', 'Work From Home')) as present
        FROM `tabEmployee` e
        WHERE e.status = 'Active'
        GROUP BY e.branch
    """, (today), as_dict=True)
    
    for b in branch_data:
        b.att_pc = round((b.present / b.total * 100), 2) if b.total > 0 else 0

    return {
        "headcount": headcount,
        "lifecycle": lifecycle,
        "attendance": {
            "summary": attendance_summary,
            "percentage": att_percentage
        },
        "leaves": leave_summary,
        "branch_wise": branch_data,
        "pending_requests": {
            "leaves": leave_summary["Open"],
            "corrections": frappe.db.count("Attendance Correction", {"status": "Pending"})
        }
    }

@frappe.whitelist()
def mark_attendance(employee, status, log_type=None):
    """
    Mark attendance or checkin for an employee.
    status: 'Present', 'Absent', 'Half Day'
    log_type: 'IN', 'OUT' (used when status is Present)
    """
    if not employee or not status:
        frappe.throw(_("Employee and Status are required"))

    today = nowdate()
    
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
    """Fetch pending attendance correction requests for the manager's team or all for HR/Admin."""
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    manager = frappe.db.get_value("Employee", {"user_id": user}, "name")
    
    filters = {"status": "Pending"}
    
    # If not Admin or HR, only show requests for employees reporting to this manager
    if "System Manager" not in roles and "Administrator" not in roles:
        if manager:
            # Get subordinates
            subordinates = frappe.get_all("Employee", filters={"reports_to": manager}, fields=["name"])
            sub_names = [s.name for s in subordinates]
            filters["employee"] = ["in", sub_names]
        else:
            return []

    corrections = frappe.get_all("Attendance Correction",
        filters=filters,
        fields=["name", "employee", "employee_name", "attendance_date", "current_status", "requested_status", "reason", "requested_by"],
        order_by="creation desc"
    )
    
    return corrections

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
            
    return history

@frappe.whitelist(allow_guest=False)
def get_leave_balances(employee):
    """Fetch leave balances for the given employee."""
    # Assuming standard HRMS/ERPNext leave balance logic
    allocations = frappe.get_all("Leave Allocation",
        filters={"employee": employee, "docstatus": 1},
        fields=["leave_type", "total_leaves_allocated", "unused_leaves"]
    )
    
    # Ab current year ke liye approve ki gayi leaves calculate karein
    for alloc in allocations:
        total_used = frappe.db.sql("""
            SELECT SUM(total_leave_days) 
            FROM `tabLeave Application` 
            WHERE employee = %s 
              AND leave_type = %s 
              AND status = 'Approved' 
              AND docstatus = 1
        """, (employee, alloc.leave_type))[0][0] or 0
        
        # Real balance = Allocated - Used
        alloc.unused_leaves = alloc.total_leaves_allocated - total_used
        
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
            manager_emp = frappe.db.get_value("Employee", {"user_id": user}, "name")
            if employee != manager_emp:
                # Check if it's a subordinate
                is_subordinate = frappe.db.exists("Employee", {"name": employee, "reports_to": manager_emp})
                if not is_subordinate:
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
