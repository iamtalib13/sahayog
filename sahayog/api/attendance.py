import frappe
from frappe import _
from frappe.utils import nowdate, nowtime, getdate, add_days

@frappe.whitelist(allow_guest=False)
def get_team_attendance_data():
    """Fetch all employees reporting to the logged-in user and their today's attendance status."""
    user = frappe.session.user
    
    # Ensure only logged in users can access
    if user == "Guest":
        frappe.throw(_("Please login to access this portal"), frappe.PermissionError)
    
    # Get current user's employee record
    current_emp = frappe.db.get_value("Employee", {"user_id": user}, ["name", "employee_name"], as_dict=True)
    
    if not current_emp and user != "Administrator":
        return {"error": True, "message": "Employee record not found for the current user."}

    # If Administrator, fetch all (for testing) or a specific subset
    # For Branch Manager, fetch ONLY reports_to = current_emp.name
    # For others, fetch reports_to = current_emp.name OR name = current_emp.name
    user_roles = frappe.get_roles(user)
    is_branch_manager = "Branch Manager" in user_roles
    
    # Debug logging
    frappe.log_error(
        title="Attendance Portal Debug",
        message=f"User: {user}, Current Emp Name: {current_emp.name if current_emp else 'None'}, Roles: {user_roles}, Is BM: {is_branch_manager}"
    )

    if user == "Administrator":
        team = frappe.get_all("Employee", 
            fields=["name", "employee_name", "designation", "branch", "status", "gender", "image"],
            order_by="employee_name",
            limit=50
        )
    elif is_branch_manager:
        team = frappe.get_all("Employee", 
            filters={"reports_to": current_emp.name},
            fields=["name", "employee_name", "designation", "branch", "status", "gender", "image"],
            order_by="employee_name"
        )
    else:
        # Check if current_emp exists before filtering
        if current_emp:
            # Use separate queries or a simpler filter to avoid potential or_filters issues
            # Get self
            self_record = frappe.get_all("Employee", 
                filters={"name": current_emp.name},
                fields=["name", "employee_name", "designation", "branch", "status", "gender", "image"]
            )
            # Get reports
            reports = frappe.get_all("Employee", 
                filters={"reports_to": current_emp.name},
                fields=["name", "employee_name", "designation", "branch", "status", "gender", "image"]
            )
            team = self_record + reports
        else:
            team = []
    
    frappe.log_error(
        title="Attendance Portal Debug",
        message=f"Final Team List for {user}: {[e.name for e in team]}"
    )
    
    today = nowdate()
    
    # Enrich team data with today's attendance/checkins
    present_count = 0
    absent_count = 0
    pending_count = 0
    on_leave_count = 0

    for emp in team:
        emp.is_self = (emp.name == current_emp.name) if current_emp else False
        att = frappe.db.get_value("Attendance", 
            {"employee": emp.name, "attendance_date": today}, 
            ["name", "status"], as_dict=True)
        
        emp.attendance_status = att.status if att else None
        
        # Check for Check-in logs
        checkins = frappe.get_all("Employee Checkin",
            filters={"employee": emp.name, "time": ["between", [today + " 00:00:00", today + " 23:59:59"]]},
            fields=["time", "log_type"],
            order_by="time asc"
        )
        
        emp.check_in = None
        emp.check_out = None
        
        if checkins:
            in_logs = [c.time for c in checkins if c.log_type == "IN"]
            out_logs = [c.time for c in checkins if c.log_type == "OUT"]
            
            if in_logs:
                # Use format_time with HH:mm to ensure HH:MM without seconds
                emp.check_in = frappe.utils.format_time(in_logs[0], "HH:mm")
                
                # IF check-in exists but no Attendance record, consider them "Present" logically for UI
                if not emp.attendance_status:
                    emp.attendance_status = "Present"
            if out_logs:
                emp.check_out = frappe.utils.format_time(out_logs[-1], "HH:mm")

        # Fetch Leave status if not present/absent
        if not emp.attendance_status:
            on_leave = frappe.db.exists("Leave Application", {
                "employee": emp.name,
                "status": "Approved",
                "from_date": ["<=", today],
                "to_date": [">=", today]
            })
            if on_leave:
                emp.attendance_status = "On Leave"

        # Log concisely
        frappe.log_error(f"DEBUG: Emp {emp.name}, Status: {emp.attendance_status}")

        # Count stats
        if emp.attendance_status == "Present":
            present_count += 1
        elif emp.attendance_status == "Absent":
            absent_count += 1
        elif emp.attendance_status == "On Leave":
            on_leave_count += 1
        else:
            pending_count += 1

    return {
        "team": team,
        "current_user": current_emp,
        "summary": {
            "total": len(team),
            "present": present_count,
            "absent": absent_count,
            "pending": pending_count,
            "on_leave": on_leave_count
        }
    }

@frappe.whitelist()
def mark_attendance(employee, status, log_type=None):
    """
    Mark attendance or checkin for an employee.
    status: 'Present', 'Absent'
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

    elif status == "Absent":
        # Create Attendance record
        if frappe.db.exists("Attendance", {"employee": employee, "attendance_date": today}):
            frappe.throw(_("Attendance already marked for today"))
            
        att = frappe.get_doc({
            "doctype": "Attendance",
            "employee": employee,
            "attendance_date": today,
            "status": "Absent",
            "company": frappe.db.get_value("Employee", employee, "company")
        })
        att.insert(ignore_permissions=True)
        att.submit()
        return {"success": True, "message": "Marked as Absent"}

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
