import frappe
from frappe.utils import getdate, nowdate, add_days

# Normalized keywords/prefixes for target designations
TARGET_DESIGNATION_PATTERNS = [
    # Assistant Branch Manager
    "%asst%branch manager%",
    "%assistant branch manager%",
    "%abm%",
    # Branch Operation / Operations Manager
    "%branch operation%manager%",
    "%assi%operation manager%",
    "%bom%",
    # Branch Officer
    "%branch officer%",
    # Customer Service Officer
    "%customer service officer%",
    "%customer service executive%",
    "%cso%",
    # Block Development Officer
    "%block development officer%",
    "%bdo%",
    # Business Development Executive
    "%business development executive%",
    "%bde%",
    # Relationship Officer (all variants: DDS, Operations, SMBG, TASC, CASA)
    "%relationship officer%",
    # Account / Accounts Executive
    "%account%executive%",
]


def get_eligible_employees():
    """Fetch active employees belonging to target designations below Branch Manager."""
    like_conditions = " OR ".join([f"LOWER(designation) LIKE {frappe.db.escape(p)}" for p in TARGET_DESIGNATION_PATTERNS])

    # Strictly exclude Branch Managers and higher positions
    sql = f"""
        SELECT 
            name, employee_name, user_id, designation, 
            branch, sahayog_branch, reports_to, holiday_list
        FROM `tabEmployee`
        WHERE status = 'Active'
          AND ({like_conditions})
          AND LOWER(designation) NOT IN ('branch manager', 'branch manager jll', 'sr. branch manager')
          AND LOWER(designation) NOT LIKE '%%area manager%%'
          AND LOWER(designation) NOT LIKE '%%regional%%'
          AND LOWER(designation) NOT LIKE '%%zonal%%'
          AND LOWER(designation) NOT LIKE '%%cluster%%'
          AND LOWER(designation) NOT LIKE '%%head%%'
    """
    return frappe.db.sql(sql, as_dict=True)


def get_employee_holiday_list(employee):
    """Retrieve assigned holiday list for employee or company default."""
    if employee.get("holiday_list"):
        return employee.get("holiday_list")
    
    # Fallback to default holiday list from Company
    default_holiday_list = frappe.db.get_single_value("Company", "default_holiday_list")
    return default_holiday_list


def get_holiday_breakup(holiday_list, from_date, to_date):
    """Return count of weekly offs and public holidays in the date range."""
    if not holiday_list:
        return {"weekly_off": 0, "holiday": 0}

    holidays = frappe.db.sql(
        """
        SELECT weekly_off, COUNT(name) as count
        FROM `tabHoliday`
        WHERE parent = %(holiday_list)s
          AND holiday_date BETWEEN %(from_date)s AND %(to_date)s
        GROUP BY weekly_off
        """,
        {
            "holiday_list": holiday_list,
            "from_date": from_date,
            "to_date": to_date
        },
        as_dict=True
    )

    result = {"weekly_off": 0, "holiday": 0}
    for h in holidays:
        if h.get("weekly_off") == 1:
            result["weekly_off"] = h.get("count", 0)
        else:
            result["holiday"] = h.get("count", 0)

    return result


def has_lead_activity_on_date(emp_id, user_id, target_date):
    """Check if the employee created or updated any Lead on target_date."""
    user_clause = f"OR lead_owner = {frappe.db.escape(user_id)} OR owner = {frappe.db.escape(user_id)}" if user_id else ""
    query = f"""
        SELECT name
        FROM `tabLead`
        WHERE (custom_employee_id = %(emp_id)s {user_clause})
          AND (DATE(creation) = %(target_date)s OR DATE(modified) = %(target_date)s)
        LIMIT 1
    """
    res = frappe.db.sql(query, {"emp_id": emp_id, "target_date": target_date}, as_dict=True)
    return bool(res)


def get_inactive_employees_for_alert(days=3):
    """Identify eligible employees who have not updated CRM leads for N consecutive days."""
    today = getdate(nowdate())
    # 3 days window up to yesterday
    to_date = add_days(today, -1)
    from_date = add_days(to_date, -(days - 1))

    # All dates in the window
    date_list = [add_days(from_date, i) for i in range(days)]

    eligible_employees = get_eligible_employees()
    inactive_employees = []

    for emp in eligible_employees:
        emp_id = emp.get("name")
        user_id = emp.get("user_id")

        # Check activity on each date
        has_activity = False
        for d in date_list:
            if has_lead_activity_on_date(emp_id, user_id, d):
                has_activity = True
                break

        # If no activity on any of the consecutive days
        if not has_activity:
            h_list = get_employee_holiday_list(emp)
            breakup = get_holiday_breakup(h_list, from_date, to_date)

            inactive_employees.append({
                "employee_code": emp_id,
                "employee_name": emp.get("employee_name"),
                "designation": emp.get("designation"),
                "branch": emp.get("branch"),
                "sahayog_branch": emp.get("sahayog_branch"),
                "reports_to": emp.get("reports_to"),
                "from_date": getdate(from_date).strftime("%d-%m-%Y"),
                "to_date": getdate(to_date).strftime("%d-%m-%Y"),
                "continuous_days": days,
                "weekly_off": breakup["weekly_off"],
                "holiday": breakup["holiday"]
            })

    return inactive_employees

