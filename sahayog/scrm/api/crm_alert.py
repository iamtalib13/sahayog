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
    """
    Return count of weekly offs and public holidays:
    - Weekly Off: Calculated through code (all Sundays in date range).
    - Holiday: Picked from Holiday List doctype (excluding Sundays to avoid double counting).
    """
    f_date = getdate(from_date)
    t_date = getdate(to_date)

    # 1. Weekly Off Count (All Sundays via code)
    weekly_offs = 0
    cur = f_date
    while cur <= t_date:
        if cur.weekday() == 6:  # Sunday
            weekly_offs += 1
        cur = add_days(cur, 1)

    # 2. Public Holidays from Holiday List Doctype
    public_holidays = 0
    if holiday_list:
        holidays = frappe.db.sql(
            """
            SELECT holiday_date
            FROM `tabHoliday`
            WHERE parent = %(holiday_list)s
              AND holiday_date BETWEEN %(from_date)s AND %(to_date)s
            """,
            {
                "holiday_list": holiday_list,
                "from_date": f_date,
                "to_date": t_date
            },
            as_dict=True
        )
        # Avoid counting a festival if it falls on Sunday (already counted as weekly off)
        for h in holidays:
            h_date = getdate(h["holiday_date"])
            if h_date.weekday() != 6:
                public_holidays += 1

    return {
        "weekly_off": weekly_offs,
        "holiday": public_holidays
    }


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


def get_inactive_employees_for_alert(days=3, branch=None):
    """
    Identify eligible employees who have not updated CRM leads for >= N consecutive days.
    Zero-JOIN, indexed, branch-scoped or global.
    """
    today = getdate(nowdate())
    yesterday = add_days(today, -1)
    cutoff_date = add_days(today, -int(days))

    branch_clause = f"AND (sahayog_branch = {frappe.db.escape(str(branch))} OR branch = {frappe.db.escape(str(branch))})" if branch else ""

    eligible_employees = frappe.db.sql(
        f"""
        SELECT 
            name, employee_name, user_id, designation, 
            branch, sahayog_branch, reports_to, holiday_list, date_of_joining
        FROM `tabEmployee`
        WHERE status = 'Active'
          {branch_clause}
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

    if not eligible_employees:
        return []

    emp_ids = [e["name"] for e in eligible_employees]

    # Find active employees in past N days without any JOIN
    active_emp_ids = set()
    if emp_ids:
        active_leads = frappe.db.sql(
            """
            SELECT DISTINCT custom_employee_id
            FROM `tabLead`
            WHERE custom_employee_id IN %(emp_ids)s
              AND (creation >= %(cutoff_date)s OR modified >= %(cutoff_date)s)
            """,
            {"emp_ids": tuple(emp_ids), "cutoff_date": cutoff_date},
            as_dict=True
        )
        active_emp_ids = {r["custom_employee_id"] for r in active_leads if r.get("custom_employee_id")}

    inactive_employees = []
    for emp in eligible_employees:
        emp_id = emp.get("name")
        if emp_id in active_emp_ids:
            continue

        user_id = emp.get("user_id")
        last_date = get_last_lead_activity_date(emp_id, user_id)

        if last_date:
            from_date = add_days(last_date, 1)
        else:
            doj = emp.get("date_of_joining")
            if doj and getdate(doj) <= yesterday:
                from_date = getdate(doj)
            else:
                from_date = add_days(yesterday, -29)

        if from_date <= yesterday:
            inactive_days = (yesterday - from_date).days + 1
        else:
            inactive_days = int(days)

        if inactive_days >= int(days):
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
            ["name", "employee_name", "designation", "company_email", "prefered_email", "personal_email", "user_id"],
            as_dict=True
        ) or {}
    
    email = (
        emp_record.get("company_email")
        or emp_record.get("user_id")
        or emp_record.get("prefered_email")
        or emp_record.get("personal_email")
    )
    if not email:
        return None

    detail = f"{emp_record.get('employee_name', '')} ({emp_record.get('name', '')} - {emp_record.get('designation', '')}) - {email}"
    return {"email": email.strip(), "detail": detail}


def find_sahayog_branch(sahayog_branch_code=None, branch_name=None):
    """Smart lookup for Sahayog Branch record by SOL ID, exact name, or normalized name."""
    if sahayog_branch_code:
        b = frappe.db.get_value("Sahayog Branch", sahayog_branch_code, ["email", "branch", "sol_id", "name"], as_dict=True)
        if b:
            return b

    if branch_name:
        b_name = str(branch_name).strip()
        # 1. Exact match
        b = frappe.db.get_value("Sahayog Branch", {"branch": b_name}, ["email", "branch", "sol_id", "name"], as_dict=True)
        if b:
            return b

        # 2. Case-insensitive / LIKE match
        # Try matching with or without 'BRANCH' keyword (e.g., 'Saoner' -> 'SAONER BRANCH')
        clean_name = b_name.lower().replace("branch", "").strip()
        matched = frappe.db.sql(
            """
            SELECT email, branch, sol_id, name
            FROM `tabSahayog Branch`
            WHERE LOWER(branch) = %(raw)s 
               OR LOWER(branch) LIKE %(clean)s
               OR LOWER(branch) LIKE %(like_clean)s
            LIMIT 1
            """,
            {
                "raw": b_name.lower(),
                "clean": f"{clean_name} branch%",
                "like_clean": f"%{clean_name}%"
            },
            as_dict=True
        )
        if matched:
            return matched[0]

    return None


def get_reporting_hierarchy_for_branch(sahayog_branch_code, branch_name=None, reports_to_emp_id=None):
    """
    Routing Rules:
    1. To: Official Branch Email from Sahayog Branch (Fallback: BM email).
    2. CC: Branch Manager (BM) company email + BM's Reporting Manager (Skip Manager).
    Returns list of dicts: [{"email": "...", "detail": "..."}]
    """
    to_recipients = []
    cc_recipients = []
    seen_to = set()
    seen_cc = set()

    # 1. Fetch Official Branch Email for 'To' (Smart Normalized Lookup)
    b_data = find_sahayog_branch(sahayog_branch_code, branch_name)

    if b_data and b_data.get("email") and b_data.get("email").strip():
        b_email = b_data["email"].strip()
        detail = f"Branch Official Email - {b_data.get('branch', '')} ({b_data.get('sol_id') or sahayog_branch_code}) - {b_email}"
        to_recipients.append({"email": b_email, "detail": detail})
        seen_to.add(b_email.lower())

    # 2. Fetch Branch Manager (BM) for 'CC' (Only for CC, never override TO)
    conditions = []
    if sahayog_branch_code:
        conditions.append(f"sahayog_branch = {frappe.db.escape(str(sahayog_branch_code))}")
    if branch_name:
        conditions.append(f"branch = {frappe.db.escape(str(branch_name))}")

    if conditions:
        bm_list = frappe.db.sql(
            f"""
            SELECT name, employee_name, designation, company_email, user_id, reports_to
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
            bm_obj = get_employee_email(bm)
            if bm_obj:
                em = bm_obj["email"].lower()
                # If official branch email not found/branch doesn't exist, BM receives 'To', else BM goes to 'CC'
                if not to_recipients:
                    to_recipients.append(bm_obj)
                    seen_to.add(em)
                elif em not in seen_to and em not in seen_cc:
                    cc_recipients.append(bm_obj)
                    seen_cc.add(em)

            # BM's Reporting Manager (Skip Manager) in CC
            if bm.get("reports_to"):
                bm_mgr = frappe.db.get_value(
                    "Employee", 
                    bm.get("reports_to"), 
                    ["name", "employee_name", "designation", "company_email", "user_id", "reports_to"], 
                    as_dict=True
                )
                if bm_mgr:
                    mgr_obj = get_employee_email(bm_mgr)
                    if mgr_obj:
                        em = mgr_obj["email"].lower()
                        if em not in seen_to and em not in seen_cc:
                            cc_recipients.append(mgr_obj)
                            seen_cc.add(em)
                    if bm_mgr.get("reports_to"):
                        top_obj = get_employee_email(bm_mgr.get("reports_to"))
                        if top_obj:
                            em = top_obj["email"].lower()
                            if em not in seen_to and em not in seen_cc:
                                cc_recipients.append(top_obj)
                                seen_cc.add(em)

    # 3. Direct reports_to fallback if BM not found
    if not to_recipients and reports_to_emp_id:
        direct_obj = get_employee_email(reports_to_emp_id)
        if direct_obj:
            em = direct_obj["email"].lower()
            to_recipients.append(direct_obj)
            seen_to.add(em)
    elif not cc_recipients and reports_to_emp_id:
        direct_obj = get_employee_email(reports_to_emp_id)
        if direct_obj:
            em = direct_obj["email"].lower()
            if em not in seen_to and em not in seen_cc:
                cc_recipients.append(direct_obj)
                seen_cc.add(em)

    return {
        "to": to_recipients,
        "cc": cc_recipients
    }



def get_branch_email(sahayog_branch):
    """Retrieve official email of the branch."""
    if not sahayog_branch:
        return None
    return frappe.db.get_value("Sahayog Branch", sahayog_branch, "email")


def generate_crm_alert_table_html(employees, to_recipients=None, cc_recipients=None, branch_title=None):
    """Generate professional HTML email formatted cleanly like Gmail/Outlook."""
    rows = ""
    for emp in employees:
        rows += f"""
        <tr style="border-bottom: 1px solid #e2e8f0; text-align: center;">
            <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">{emp.get('employee_code')}</td>
            <td style="padding: 10px 12px; text-align: left; color: #0f172a;">{emp.get('employee_name')}</td>
            <td style="padding: 10px 12px; color: #475569;">{emp.get('from_date')}</td>
            <td style="padding: 10px 12px; color: #475569;">{emp.get('to_date')}</td>
            <td style="padding: 10px 12px; font-weight: 700; color: #dc2626; background: #fef2f2;">{emp.get('continuous_days')}</td>
            <td style="padding: 10px 12px; color: #475569;">{emp.get('weekly_off')}</td>
            <td style="padding: 10px 12px; color: #475569;">{emp.get('holiday')}</td>
        </tr>
        """

    to_str = ", ".join(to_recipients) if to_recipients else "None"
    cc_str = ", ".join(cc_recipients) if cc_recipients else "None"
    branch_heading = f" - {branch_title}" if branch_title else ""

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.6; max-width: 850px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        
        <!-- Email Header Section (Gmail/Outlook Style) -->
        <div style="background-color: #f8fafc; padding: 16px 20px; border-bottom: 2px solid #e2e8f0;">
            <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 10px;">
                CRM Alert{branch_heading}
            </div>
            <table style="width: 100%; font-size: 12px; color: #475569; border-collapse: collapse;">
                <tr>
                    <td style="width: 45px; font-weight: 600; color: #64748b; padding: 3px 0;">To:</td>
                    <td style="color: #0369a1; font-weight: 500; padding: 3px 0;">{to_str}</td>
                </tr>
                <tr>
                    <td style="width: 45px; font-weight: 600; color: #64748b; padding: 3px 0;">Cc:</td>
                    <td style="color: #475569; padding: 3px 0;">{cc_str}</td>
                </tr>
            </table>
        </div>

        <!-- Body Section -->
        <div style="padding: 20px;">
            <p style="margin-top: 0; color: #334155;">Respected Sir / Madam,</p>
            <p style="color: #334155;">The following staff member(s) have not updated CRM leads for <b>3 consecutive days</b>. Kindly review and ensure timely lead updates:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; border: 1px solid #cbd5e1; font-size: 12px;">
                <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-weight: 600; color: #334155;">
                        <th style="padding: 10px 12px; text-align: center;">Employee Code</th>
                        <th style="padding: 10px 12px; text-align: left;">Employee Name</th>
                        <th style="padding: 10px 12px; text-align: center;">From Date</th>
                        <th style="padding: 10px 12px; text-align: center;">To Date</th>
                        <th style="padding: 10px 12px; text-align: center;">No of Continuous Not update Days</th>
                        <th style="padding: 10px 12px; text-align: center;">Weekly Off</th>
                        <th style="padding: 10px 12px; text-align: center;">Holiday</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table>

            <p style="color: #64748b; font-size: 11px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                This is an automated system-generated CRM Alert initiated by Sahayog CRM.
            </p>
        </div>
    </div>
    """
    return html


def get_crm_alert_settings():
    """Fetch TO and CC enable/disable configurations from Sahayog Settings."""
    try:
        settings = frappe.get_cached_value(
            "Sahayog Settings",
            None,
            ["enable_crm_alert_to", "enable_crm_alert_cc"],
            as_dict=True
        ) or {}
        return {
            "enable_to": bool(settings.get("enable_crm_alert_to", 1)),
            "enable_cc": bool(settings.get("enable_crm_alert_cc", 1))
        }
    except Exception:
        return {"enable_to": True, "enable_cc": True}


@frappe.whitelist()
def search_alert_emails(txt=""):
    """Search email addresses from Sahayog Branch and Employee (company_email)."""
    search_txt = f"%{(txt or '').strip()}%"
    results = []
    seen = set()

    # 1. Search in Sahayog Branch
    branches = frappe.db.sql(
        """
        SELECT email, branch, name as sol_id
        FROM `tabSahayog Branch`
        WHERE email IS NOT NULL AND email != ''
          AND (email LIKE %(txt)s OR branch LIKE %(txt)s OR name LIKE %(txt)s)
        LIMIT 10
        """,
        {"txt": search_txt},
        as_dict=True
    )
    for b in branches:
        em = b["email"].strip().lower()
        if em not in seen:
            seen.add(em)
            results.append({
                "value": b["email"].strip(),
                "label": f"{b['branch']} ({b['sol_id']}) - {b['email'].strip()}",
                "description": "Branch Email"
            })

    # 2. Search in Employee (company_email, user_id)
    employees = frappe.db.sql(
        """
        SELECT company_email, employee_name, name as emp_code, designation
        FROM `tabEmployee`
        WHERE status = 'Active'
          AND company_email IS NOT NULL AND company_email != ''
          AND (company_email LIKE %(txt)s OR employee_name LIKE %(txt)s OR name LIKE %(txt)s)
        LIMIT 15
        """,
        {"txt": search_txt},
        as_dict=True
    )
    for e in employees:
        em = e["company_email"].strip().lower()
        if em not in seen:
            seen.add(em)
            results.append({
                "value": e["company_email"].strip(),
                "label": f"{e['employee_name']} ({e['emp_code']} - {e.get('designation') or ''}) - {e['company_email'].strip()}",
                "description": "Employee Company Email"
            })

    return results


@frappe.whitelist()
def get_branch_list_for_filter():
    """Fast, lightweight endpoint to get list of all branches for dropdown."""
    branches = frappe.db.sql(
        """
        SELECT name as value, CONCAT(IFNULL(branch, name), ' (', name, ')') as label
        FROM `tabSahayog Branch`
        ORDER BY branch ASC
        """,
        as_dict=True
    )
    return branches


@frappe.whitelist()
def get_crm_alert_preview(branch=None, days=3):
    """
    On-Demand Preview API:
    - If branch is None: returns only status without querying leads.
    - If branch is selected: runs targeted lightweight queries strictly for that branch.
    """
    if not branch:
        return {
            "selected_branch": None,
            "preview": None
        }

    branch_str = str(branch).strip()
    inactive_employees = get_inactive_employees_for_alert(days=int(days), branch=branch_str)

    if not inactive_employees:
        b_name = frappe.db.get_value("Sahayog Branch", branch_str, "branch") or branch_str
        return {
            "selected_branch": branch_str,
            "branch_name": b_name,
            "total_inactive": 0,
            "preview": None
        }

    sample_emp = inactive_employees[0]
    hierarchy = get_reporting_hierarchy_for_branch(
        sahayog_branch_code=sample_emp.get("sahayog_branch"),
        branch_name=sample_emp.get("branch"),
        reports_to_emp_id=sample_emp.get("reports_to")
    )

    b_name = frappe.db.get_value("Sahayog Branch", branch_str, "branch") or sample_emp.get("branch") or branch_str

    alert_settings = get_crm_alert_settings()
    to_hierarchy = hierarchy.get("to", []) if alert_settings["enable_to"] else []
    cc_hierarchy = hierarchy.get("cc", []) if alert_settings["enable_cc"] else []

    to_emails = [r["email"] for r in to_hierarchy]
    cc_emails = [r["email"] for r in cc_hierarchy]

    table_html = generate_crm_alert_table_html(
        employees=inactive_employees,
        to_recipients=to_emails,
        cc_recipients=cc_emails,
        branch_title=b_name
    )

    preview_item = {
        "branch": branch_str,
        "branch_name": b_name,
        "subject": "CRM Alert",
        "to": to_hierarchy,
        "cc": cc_hierarchy,
        "employee_count": len(inactive_employees),
        "html": table_html
    }

    return {
        "selected_branch": branch_str,
        "branch_name": b_name,
        "total_inactive": len(inactive_employees),
        "preview": preview_item,
        "settings": alert_settings
    }


@frappe.whitelist()
def send_test_crm_alert_mail(to_recipients, cc_recipients=None, subject="CRM Alert", html_content="", branch=None):
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

    branch_code = str(branch).strip() if branch else None

    frappe.sendmail(
        recipients=to_recipients,
        cc=cc_recipients or [],
        subject=subject or "CRM Alert",
        message=html_content,
        delayed=False,
        reference_doctype="Sahayog Branch" if branch_code else None,
        reference_name=branch_code
    )

    return {"status": "success", "message": f"Test alert email sent to {', '.join(to_recipients)}"}


def send_crm_inactivity_alerts(days=3):
    """
    Main background scheduled function:
    1. Fetches all inactive eligible employees across branches (>= 3 days).
    2. Groups inactive staff branch-wise into consolidated email tables.
    3. Dispatches automated alert:
       - To: Official Branch Email (from Sahayog Branch)
       - CC: Branch Manager (BM) + Skip Managers (SM, DH)
       - Subject: CRM Alert
    """
    inactive_employees = get_inactive_employees_for_alert(days=int(days))
    if not inactive_employees:
        return {"status": "success", "sent": 0, "message": "No inactive employees found for CRM alert"}

    # Group strictly by Sahayog Branch (SOL ID / Master) to ensure exact branch consolidation
    grouped_by_branch = {}
    for emp in inactive_employees:
        branch_key = emp.get("sahayog_branch")
        if not branch_key and emp.get("branch"):
            b_found = find_sahayog_branch(branch_name=emp.get("branch"))
            if b_found:
                branch_key = b_found["name"]
        
        branch_key = branch_key or emp.get("branch") or "Unknown"

        if branch_key not in grouped_by_branch:
            grouped_by_branch[branch_key] = []
        grouped_by_branch[branch_key].append(emp)

    sent_count = 0
    failed_count = 0
    skipped_count = 0
    success_branches = []
    failed_branches = []
    skipped_branches = []

    alert_settings = get_crm_alert_settings()
    total_branches = len(grouped_by_branch)
    print(f"\n--- Starting CRM Inactivity Alerts for {total_branches} Branches ---")

    for idx, (branch_key, emp_list) in enumerate(grouped_by_branch.items(), 1):
        sample_emp = emp_list[0]
        branch_name = frappe.db.get_value("Sahayog Branch", branch_key, "branch") or sample_emp.get("branch") or branch_key

        try:
            hierarchy = get_reporting_hierarchy_for_branch(
                sahayog_branch_code=sample_emp.get("sahayog_branch"),
                branch_name=sample_emp.get("branch"),
                reports_to_emp_id=sample_emp.get("reports_to")
            )

            to_emails = [r["email"] for r in hierarchy.get("to", [])] if alert_settings["enable_to"] else []
            cc_emails = [r["email"] for r in hierarchy.get("cc", [])] if alert_settings["enable_cc"] else []

            # If both TO and CC are disabled or empty, we cannot send
            final_recipients = to_emails or cc_emails
            if not final_recipients:
                skipped_count += 1
                skipped_branches.append(f"{branch_name} ({branch_key})")
                print(f"[{idx}/{total_branches}] [SKIPPED] {branch_name} ({branch_key}) - No recipient emails resolved")
                continue

            table_html = generate_crm_alert_table_html(
                employees=emp_list,
                to_recipients=to_emails,
                cc_recipients=cc_emails,
                branch_title=f"{branch_name} ({branch_key})"
            )

            frappe.sendmail(
                recipients=final_recipients,
                cc=cc_emails if to_emails else [],
                subject=f"CRM Alert - {branch_name}",
                message=table_html,
                delayed=False,
                reference_doctype="Sahayog Branch",
                reference_name=str(branch_key)
            )
            sent_count += 1
            success_branches.append(f"{branch_name} ({branch_key})")
            print(f"[{idx}/{total_branches}] [SUCCESS] {branch_name} ({branch_key}) -> Sent to: {', '.join(final_recipients)}")

        except Exception as err:
            failed_count += 1
            failed_branches.append({"branch": f"{branch_name} ({branch_key})", "error": str(err)})
            print(f"[{idx}/{total_branches}] [FAILED] {branch_name} ({branch_key}) -> Error: {err}")

    summary_msg = f"\n--- CRM Alert Execution Summary ---\n" \
                  f"Total Branches: {total_branches} | Successful: {sent_count} | Failed: {failed_count} | Skipped: {skipped_count}\n"
    print(summary_msg)

    return {
        "status": "success" if failed_count == 0 else "partial_success",
        "total_branches": total_branches,
        "branches_emailed": sent_count,
        "failed_count": failed_count,
        "skipped_count": skipped_count,
        "success_branches": success_branches,
        "failed_branches": failed_branches,
        "skipped_branches": skipped_branches,
        "total_inactive": len(inactive_employees)
    }


@frappe.whitelist()
def get_crm_alert_email_logs(branch=None, limit=30):
    """Fetch tracked emails strictly related to 'CRM Alert' from Email Queue."""
    conditions = ["(eq.message LIKE %(crm_kw)s OR eq.reference_doctype = 'Sahayog Branch')"]
    params = {"limit": int(limit), "crm_kw": "%CRM Alert%"}

    if branch:
        b_str = str(branch).strip()
        b_name = frappe.db.get_value("Sahayog Branch", b_str, "branch") or b_str
        conditions.append("(eq.reference_name = %(branch)s OR eq.message LIKE %(branch_search)s)")
        params["branch"] = b_str
        params["branch_search"] = f"%{b_name}%"

    where_clause = " AND ".join(conditions)

    logs = frappe.db.sql(
        f"""
        SELECT 
            eq.name,
            eq.message_id,
            DATE_FORMAT(eq.creation, '%%d-%%m-%%Y %%H:%%i:%%s') as creation,
            COALESCE(eqr.status, eq.status) as status,
            eq.error,
            COALESCE(sb.branch, eq.reference_name, 'General CRM Alert') as branch,
            eqr.recipient
        FROM `tabEmail Queue` eq
        JOIN `tabEmail Queue Recipient` eqr ON eqr.parent = eq.name
        LEFT JOIN `tabSahayog Branch` sb ON sb.name = eq.reference_name
        WHERE {where_clause}
        ORDER BY eq.creation DESC
        LIMIT %(limit)s
        """,
        params,
        as_dict=True
    )
    return logs




