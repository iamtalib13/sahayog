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
    """Retrieve assigned holiday list for employee or fallback to state/company."""
    if employee.get("holiday_list"):
        return employee.get("holiday_list")
    
    # Check branch state
    branch_id = employee.get("sahayog_branch")
    if branch_id:
        state = frappe.db.get_value("Sahayog Branch", branch_id, "state")
        if state:
            curr_year = getdate(nowdate()).year
            hl = frappe.db.get_value(
                "Holiday List",
                {"name": ["like", f"{state.strip()}%{curr_year}%"]},
                "name"
            )
            if hl:
                return hl

    # Fallback to default holiday list from Company
    default_holiday_list = frappe.db.get_single_value("Company", "default_holiday_list")
    return default_holiday_list


def get_holiday_breakup(holiday_list, from_date, to_date):
    """Return count of weekly offs and public holidays in the date range."""
    # Calendar based fallback if no holiday list is found
    if not holiday_list:
        weekly_offs = 0
        cur = getdate(from_date)
        end = getdate(to_date)
        while cur <= end:
            if cur.weekday() == 6:  # Sunday
                weekly_offs += 1
            cur = add_days(cur, 1)
        return {"weekly_off": weekly_offs, "holiday": 0}

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


def get_last_lead_activity_date(emp_id, user_id):
    """Find the most recent date on which employee created or updated a Lead."""
    user_clause = f"OR lead_owner = {frappe.db.escape(user_id)} OR owner = {frappe.db.escape(user_id)}" if user_id else ""
    query = f"""
        SELECT GREATEST(
            COALESCE(MAX(creation), '2000-01-01'),
            COALESCE(MAX(modified), '2000-01-01')
        ) as last_active
        FROM `tabLead`
        WHERE (custom_employee_id = %(emp_id)s {user_clause})
    """
    res = frappe.db.sql(query, {"emp_id": emp_id}, as_dict=True)
    if res and res[0].get("last_active") and str(res[0].get("last_active")) > '2000-01-01':
        return getdate(res[0].get("last_active"))
    return None


def get_inactive_employees_for_alert(days=3):
    """Identify eligible employees who have not updated CRM leads for >= N consecutive days."""
    today = getdate(nowdate())
    yesterday = add_days(today, -1)

    eligible_employees = frappe.db.sql(
        f"""
        SELECT 
            name, employee_name, user_id, designation, 
            branch, sahayog_branch, reports_to, holiday_list, date_of_joining
        FROM `tabEmployee`
        WHERE status = 'Active'
          AND ({ " OR ".join([f"LOWER(designation) LIKE {frappe.db.escape(p)}" for p in TARGET_DESIGNATION_PATTERNS]) })
          AND LOWER(designation) NOT IN ('branch manager', 'branch manager jll', 'sr. branch manager')
          AND LOWER(designation) NOT LIKE '%%area manager%%'
          AND LOWER(designation) NOT LIKE '%%regional%%'
          AND LOWER(designation) NOT LIKE '%%zonal%%'
          AND LOWER(designation) NOT LIKE '%%cluster%%'
          AND LOWER(designation) NOT LIKE '%%head%%'
        """,
        as_dict=True
    )

    inactive_employees = []

    for emp in eligible_employees:
        emp_id = emp.get("name")
        user_id = emp.get("user_id")

        last_date = get_last_lead_activity_date(emp_id, user_id)
        
        if last_date:
            # Not updated since last_date + 1
            from_date = add_days(last_date, 1)
        else:
            # If no lead ever, count from date_of_joining or 30 days max
            doj = emp.get("date_of_joining")
            if doj and getdate(doj) <= yesterday:
                from_date = getdate(doj)
            else:
                from_date = add_days(yesterday, -29)

        # Calculate exact inactive days up to yesterday
        if from_date <= yesterday:
            inactive_days = (yesterday - from_date).days + 1
        else:
            inactive_days = 0

        # Only alert if inactive for >= days (e.g. 3)
        if inactive_days >= days:
            h_list = get_employee_holiday_list(emp)
            breakup = get_holiday_breakup(h_list, from_date, yesterday)

            inactive_employees.append({
                "employee_code": emp_id,
                "employee_name": emp.get("employee_name"),
                "designation": emp.get("designation"),
                "branch": emp.get("branch"),
                "sahayog_branch": emp.get("sahayog_branch"),
                "reports_to": emp.get("reports_to"),
                "from_date": getdate(from_date).strftime("%d-%m-%Y"),
                "to_date": getdate(yesterday).strftime("%d-%m-%Y"),
                "continuous_days": inactive_days,
                "weekly_off": breakup["weekly_off"],
                "holiday": breakup["holiday"]
            })

    return inactive_employees


def get_employee_email(emp_record):
    """Fetch company_email with fallback to user_id/personal_email."""
    if not emp_record:
        return None
    if isinstance(emp_record, str):
        emp_record = frappe.db.get_value(
            "Employee",
            emp_record,
            ["company_email", "prefered_email", "personal_email", "user_id"],
            as_dict=True
        ) or {}
    
    return (
        emp_record.get("company_email")
        or emp_record.get("user_id")
        or emp_record.get("prefered_email")
        or emp_record.get("personal_email")
    )


def get_reporting_hierarchy_for_branch(sahayog_branch_code, branch_name=None, reports_to_emp_id=None):
    """Resolve BM as 'To' and BM's Reporting Manager (AM/ZM/DH) as 'CC' using company_email."""
    to_recipients = []
    cc_recipients = []

    # 1. Direct reports_to if present
    if reports_to_emp_id:
        emp1 = frappe.db.get_value(
            "Employee", 
            reports_to_emp_id, 
            ["name", "company_email", "user_id", "reports_to"], 
            as_dict=True
        )
        if emp1:
            email1 = get_employee_email(emp1)
            if email1:
                to_recipients.append(email1)
            if emp1.get("reports_to"):
                emp2 = frappe.db.get_value(
                    "Employee", 
                    emp1.get("reports_to"), 
                    ["name", "company_email", "user_id", "reports_to"], 
                    as_dict=True
                )
                if emp2:
                    email2 = get_employee_email(emp2)
                    if email2:
                        cc_recipients.append(email2)
                    if emp2.get("reports_to"):
                        email3 = get_employee_email(emp2.get("reports_to"))
                        if email3:
                            cc_recipients.append(email3)

    # 2. Branch Manager lookup if 'To' is empty
    if not to_recipients:
        conditions = []
        if sahayog_branch_code:
            conditions.append(f"sahayog_branch = {frappe.db.escape(str(sahayog_branch_code))}")
        if branch_name:
            conditions.append(f"branch = {frappe.db.escape(str(branch_name))}")

        if conditions:
            bm_list = frappe.db.sql(
                f"""
                SELECT name, employee_name, company_email, user_id, reports_to
                FROM `tabEmployee`
                WHERE status = 'Active'
                  AND ({ ' OR '.join(conditions) })
                  AND designation LIKE '%%BRANCH MANAGER%%'
                  AND LOWER(designation) NOT LIKE '%%asst%%'
                  AND LOWER(designation) NOT LIKE '%%assistant%%'
                LIMIT 1
                """,
                as_dict=True
            )
            if bm_list:
                bm = bm_list[0]
                bm_email = get_employee_email(bm)
                if bm_email:
                    to_recipients.append(bm_email)
                
                # BM's reports_to goes into CC
                if bm.get("reports_to"):
                    bm_mgr = frappe.db.get_value(
                        "Employee", 
                        bm.get("reports_to"), 
                        ["name", "company_email", "user_id", "reports_to"], 
                        as_dict=True
                    )
                    if bm_mgr:
                        mgr_email = get_employee_email(bm_mgr)
                        if mgr_email:
                            cc_recipients.append(mgr_email)
                        if bm_mgr.get("reports_to"):
                            top_email = get_employee_email(bm_mgr.get("reports_to"))
                            if top_email:
                                cc_recipients.append(top_email)

    # 3. Add official Branch Email to 'To' if configured
    if sahayog_branch_code:
        b_email = frappe.db.get_value("Sahayog Branch", sahayog_branch_code, "email")
        if b_email and b_email not in to_recipients:
            to_recipients.append(b_email)

    return {
        "to": [r for r in to_recipients if r],
        "cc": [r for r in cc_recipients if r and r not in to_recipients]
    }



def get_branch_email(sahayog_branch):
    """Retrieve official email of the branch."""
    if not sahayog_branch:
        return None
    return frappe.db.get_value("Sahayog Branch", sahayog_branch, "email")


def generate_crm_alert_table_html(employees):
    """Generate HTML table formatted exactly as per requirement."""
    rows = ""
    for emp in employees:
        rows += f"""
        <tr style="border-bottom: 1px solid #e2e8f0; text-align: center;">
            <td style="padding: 8px 12px; font-weight: 600;">{emp.get('employee_code')}</td>
            <td style="padding: 8px 12px; text-align: left;">{emp.get('employee_name')}</td>
            <td style="padding: 8px 12px;">{emp.get('from_date')}</td>
            <td style="padding: 8px 12px;">{emp.get('to_date')}</td>
            <td style="padding: 8px 12px; font-weight: 600; color: #dc2626;">{emp.get('continuous_days')}</td>
            <td style="padding: 8px 12px;">{emp.get('weekly_off')}</td>
            <td style="padding: 8px 12px;">{emp.get('holiday')}</td>
        </tr>
        """

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5;">
        <p>Respected Sir / Madam,</p>
        <p>The following staff member(s) have not updated CRM leads for <b>3 consecutive days</b>. Kindly review and ensure timely lead updates:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 16px; border: 1px solid #cbd5e1; font-size: 12px;">
            <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; font-weight: 600; color: #475569;">
                    <th style="padding: 8px 12px; text-align: center;">Employee Code</th>
                    <th style="padding: 8px 12px; text-align: left;">Employee Name</th>
                    <th style="padding: 8px 12px; text-align: center;">From Date</th>
                    <th style="padding: 8px 12px; text-align: center;">To Date</th>
                    <th style="padding: 8px 12px; text-align: center;">No of Continuous Not update Days</th>
                    <th style="padding: 8px 12px; text-align: center;">Weekly Off</th>
                    <th style="padding: 8px 12px; text-align: center;">Holiday</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>

        <p style="color: #64748b; font-size: 11px; margin-top: 20px;">This is an automated system-generated CRM Alert.</p>
    </div>
    """
    return html


@frappe.whitelist()
def get_crm_alert_preview(days=3):
    """API for UI Preview: Returns grouped inactive employees and exact email payloads."""
    inactive_employees = get_inactive_employees_for_alert(days=int(days))

    # Group by branch
    grouped_by_branch = {}
    for emp in inactive_employees:
        branch_key = emp.get("sahayog_branch") or emp.get("branch") or "Unknown"
        if branch_key not in grouped_by_branch:
            grouped_by_branch[branch_key] = []
        grouped_by_branch[branch_key].append(emp)

    previews = []
    for branch_key, emp_list in grouped_by_branch.items():
        sample_emp = emp_list[0]
        hierarchy = get_reporting_hierarchy_for_branch(
            sahayog_branch_code=sample_emp.get("sahayog_branch"),
            branch_name=sample_emp.get("branch"),
            reports_to_emp_id=sample_emp.get("reports_to")
        )

        table_html = generate_crm_alert_table_html(emp_list)

        previews.append({
            "branch": branch_key,
            "branch_name": sample_emp.get("branch") or branch_key,
            "subject": "CRM Alert",
            "to": hierarchy.get("to", []),
            "cc": hierarchy.get("cc", []),
            "employee_count": len(emp_list),
            "html": table_html
        })

    return {
        "total_inactive": len(inactive_employees),
        "total_branches": len(previews),
        "previews": previews[:15]  # preview first 15 branches
    }


@frappe.whitelist()
def send_test_crm_alert_mail(to_recipients, cc_recipients=None, subject="CRM Alert", html_content=""):
    """Whitelisted function for sending live test email with editable recipients."""
    if isinstance(to_recipients, str):
        import json
        try:
            to_recipients = json.loads(to_recipients)
        except Exception:
            to_recipients = [e.strip() for e in to_recipients.split(",") if e.strip()]

    if isinstance(cc_recipients, str) and cc_recipients:
        import json
        try:
            cc_recipients = json.loads(cc_recipients)
        except Exception:
            cc_recipients = [e.strip() for e in cc_recipients.split(",") if e.strip()]

    if not to_recipients:
        frappe.throw("Please specify at least one recipient in 'To'.")

    frappe.sendmail(
        recipients=to_recipients,
        cc=cc_recipients or [],
        subject=subject or "CRM Alert",
        message=html_content,
        delayed=False
    )

    return {"status": "success", "message": f"Test alert email sent to {', '.join(to_recipients)}"}



