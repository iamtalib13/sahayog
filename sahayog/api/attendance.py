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
    
    if "Branch Manager" in roles or user == "Administrator":
        # Branch Managers manage their team
        filters = {"reports_to": manager.name} if manager else {}
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
        "current_user": manager
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
