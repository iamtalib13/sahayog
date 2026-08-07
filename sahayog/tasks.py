import frappe
from calendar import monthrange
from frappe.utils import getdate, today, add_months, date_diff, flt, add_days
from frappe import _


LEAVE_MONTHLY_RATES = {
    "Sick Leave": 0.5,
    "Casual Leave": 0.25,
    "Earned Leave": 1.25,
}


def _fiscal_year_bounds(d):
    """Return (start, end) of the Apr 1 - Mar 31 financial year containing date d."""
    fy_start = getdate(f"{d.year}-04-01")
    if d < fy_start:
        fy_start = getdate(f"{d.year - 1}-04-01")
    fy_end = getdate(f"{fy_start.year + 1}-03-31")
    return fy_start, fy_end


def _get_or_create_yearly_allocation(emp, lt_name, today_date):
    """Return active allocation for the current financial year; create one if missing (auto-renewal).

    Uses Apr 1 - Mar 31 financial-year windows. On renewal, unused leaves are carried
    forward into the new window via HRMS native carry_forward (caps are applied from the
    Leave Type `maximum_carry_forwarded_leaves` field).
    """
    alloc = frappe.db.get_value(
        "Leave Allocation",
        {
            "employee": emp.name,
            "leave_type": lt_name,
            "docstatus": 1,
            "from_date": ("<=", today_date),
            "to_date": (">=", today_date),
        },
        ["name", "from_date", "to_date"],
        as_dict=1,
    )
    if alloc:
        return alloc

    fy_start, fy_end = _fiscal_year_bounds(today_date)
    rate = LEAVE_MONTHLY_RATES[lt_name]

    # Latest expired allocation — determines renewal start and carry forward
    prev = frappe.db.get_value(
        "Leave Allocation",
        {
            "employee": emp.name,
            "leave_type": lt_name,
            "docstatus": 1,
            "to_date": ("<", today_date),
        },
        ["name", "to_date"],
        order_by="to_date desc",
        as_dict=1,
    )

    if prev:
        # Renewal: start right after the old allocation expired so HRMS's
        # get_previous_allocation can pick it up and carry forward its unused leaves.
        from_date = max(add_days(prev.to_date, 1), fy_start)
        to_date = fy_end
        carry_forward = 1
    else:
        from_date = max(emp.date_of_joining or today_date, fy_start)
        to_date = fy_end
        carry_forward = 0

    # Set new_leaves_allocated to monthly rate so total_leaves_allocated > 0
    # (HRMS requires total_leaves_allocated > 0 for non-earned leave types)
    doc = frappe.get_doc({
        "doctype": "Leave Allocation",
        "employee": emp.name,
        "leave_type": lt_name,
        "from_date": from_date,
        "to_date": to_date,
        "new_leaves_allocated": rate,
        "carry_forward": carry_forward,
    })
    try:
        doc.insert(ignore_permissions=True)
        doc.submit()
        return {"name": doc.name, "from_date": doc.from_date, "to_date": doc.to_date}
    except Exception as e:
        frappe.log_error(
            f"Failed to create yearly {lt_name} allocation for {emp.employee_name}: {e}",
            "Leave Auto-Renewal",
        )
        return None


def monthly_leave_credit():
    """Run on 1st of each month — credit monthly SL/CL/EL to active support staff.

    Auto-creates the financial-year allocation envelope if missing (handles FY-end renewal
    automatically — e.g. Apr 2027 will create a fresh Apr 2027 - Mar 2028 allocation).

    Skips crediting if the allocation was just created this month (new_leaves_allocated
    already covers the first month's credit).
    """
    from hrms.hr.doctype.leave_ledger_entry.leave_ledger_entry import create_leave_ledger_entry

    today_date = getdate(today())
    if today_date.day != 1:
        return

    first_of_month = today_date
    _, year_end = _fiscal_year_bounds(today_date)

    employees = frappe.get_all(
        "Employee",
        filters={"status": "Active", "custom_is_support_staff": 1},
        fields=["name", "employee_name", "date_of_joining", "final_confirmation_date"],
    )

    for emp in employees:
        if not emp.date_of_joining or emp.date_of_joining > today_date:
            continue

        for lt_name, rate in LEAVE_MONTHLY_RATES.items():
            alloc = _get_or_create_yearly_allocation(emp, lt_name, today_date)
            if not alloc:
                continue

            # Skip if allocation was created this month (new_leaves_allocated covers it)
            if (
                getdate(alloc.from_date).year == today_date.year
                and getdate(alloc.from_date).month == today_date.month
            ):
                continue

            already_credited = frappe.db.exists(
                "Leave Ledger Entry",
                {
                    "employee": emp.name,
                    "leave_type": lt_name,
                    "transaction_name": alloc.name,
                    "from_date": first_of_month,
                    "docstatus": 1,
                },
            )
            if already_credited:
                continue

            args = frappe._dict(
                leaves=rate,
                from_date=first_of_month,
                to_date=year_end,
                is_carry_forward=0,
                is_expired=0,
                is_lwp=0,
            )
            try:
                create_leave_ledger_entry(frappe.get_doc("Leave Allocation", alloc.name), args, submit=True)
            except Exception as e:
                frappe.log_error(
                    f"Failed to credit {lt_name} for {emp.employee_name}: {e}",
                    "Monthly Leave Credit",
                )


def auto_setup_new_employee_leave():
    """Create initial Leave Allocation for support staff without any allocation.

    Sets new_leaves_allocated to the pro-rata (joining month) or full monthly rate.
    After this, monthly_leave_credit handles everything going forward — including
    auto-renewal at the financial year end.
    """
    today_date = getdate(today())
    fy_start, fy_end = _fiscal_year_bounds(today_date)

    employees = frappe.get_all(
        "Employee",
        filters={"status": "Active", "custom_is_support_staff": 1},
        fields=["name", "employee_name", "date_of_joining", "final_confirmation_date"],
    )

    for emp in employees:
        if not emp.date_of_joining or emp.date_of_joining > today_date:
            continue

        has_any_alloc = frappe.db.exists(
            "Leave Allocation",
            {"employee": emp.name, "docstatus": 1, "leave_type": ("in", ("Sick Leave", "Casual Leave", "Earned Leave"))},
        )
        if has_any_alloc:
            continue

        for lt_name, rate in LEAVE_MONTHLY_RATES.items():
            from_date = max(emp.date_of_joining, fy_start)

            # Pro-rata if joining this month, else full monthly rate
            if (
                emp.date_of_joining.year == today_date.year
                and emp.date_of_joining.month == today_date.month
            ):
                month_days = monthrange(today_date.year, today_date.month)[1]
                days_employed = month_days - emp.date_of_joining.day + 1
                factor = flt(days_employed / month_days, 4)
                new_leaves = flt(rate * factor, 2)
            else:
                new_leaves = rate

            alloc = frappe.get_doc({
                "doctype": "Leave Allocation",
                "employee": emp.name,
                "leave_type": lt_name,
                "from_date": from_date,
                "to_date": fy_end,
                "new_leaves_allocated": new_leaves,
                "carry_forward": 0,
            })
            try:
                alloc.insert(ignore_permissions=True)
                alloc.submit()
            except Exception as e:
                frappe.log_error(
                    f"Failed to create initial {lt_name} allocation for {emp.employee_name}: {e}",
                    "Auto Leave Setup",
                )


def reset_auto_prepared_reports():
    """Reset reports where prepared_report=1"""
    reports = frappe.get_all('Report', filters={'prepared_report': 1}, pluck='name')
    
    if not reports:
        return
    
    for report_name in reports:
        frappe.db.set_value('Report', report_name, 'prepared_report', 0, update_modified=False)
    
    frappe.db.commit()



@frappe.whitelist()
def sync_district_state():
    # Fetch unique district and state
    data = frappe.db.sql("""
        SELECT DISTINCT district, state
        FROM `tabSahayog Branch`
        WHERE district IS NOT NULL AND state IS NOT NULL
    """, as_dict=True)

    for row in data:
        district = row.get("district")
        state = row.get("state")

        # Create State if not exists
        if state and not frappe.db.exists("State", state):
            doc = frappe.new_doc("State")
            doc.state = state          # field
            doc.name = state           # required for naming series = field: state
            doc.insert(ignore_permissions=True)

        # Create District if not exists
        if district and not frappe.db.exists("District", district):
            doc = frappe.new_doc("District")
            doc.district = district    # field
            doc.state = state          # link to state
            doc.name = district        # required for naming series = field: district
            doc.insert(ignore_permissions=True)


def auto_approve_leave_applications():
    """Auto-approve all pending (Open/Draft) leave applications for support staff."""
    pending = frappe.get_all(
        "Leave Application",
        filters={"status": "Open", "docstatus": 0},
        fields=["name"],
    )

    for la in pending:
        try:
            doc = frappe.get_doc("Leave Application", la.name)
            if not frappe.db.get_value("Employee", doc.employee, "custom_is_support_staff"):
                continue
            doc.status = "Approved"
            doc.flags.ignore_permissions = True
            doc.save()
            doc.submit()
            frappe.db.commit()
        except Exception as e:
            frappe.log_error(
                f"Failed to auto-approve Leave Application {la.name}: {e}",
                "Auto Leave Approval",
            )

    return f"Processed {len(pending)} leave applications."


def auto_approve_attendance_corrections():
    """Auto-approve all pending attendance correction requests."""
    pending_corrections = frappe.get_all(
        "Attendance Correction",
        filters={"status": "Pending"},
        fields=["name"]
    )
    
    for correction in pending_corrections:
        try:
            doc = frappe.get_doc("Attendance Correction", correction.name)
            doc.status = "Approved"
            doc.approved_by = "Administrator"
            doc.approval_date = frappe.utils.now_datetime()
            # Calling save() will trigger the on_update method in AttendanceCorrection,
            # which in turn calls apply_correction()
            doc.save(ignore_permissions=True)
            frappe.db.commit()
        except Exception as e:
            frappe.log_error(f"Failed to auto-approve Attendance Correction {correction.name}: {str(e)}", "Auto-Approval Error")
    
    return f"Processed {len(pending_corrections)} attendance correction requests."



# def notify_inactive_ss():
#     """
#     Daily job: find agents with no call log activity for 90+ days.
#     Uncomment and register in hooks.py daily scheduler to enable.
#     """
#     inactive_agents = frappe.db.sql(
#         """
#         SELECT
#             a.name AS agent_code,
#             a.agent_name,
#             a.branch_name,
#             MAX(acl.calling_date) AS last_call_date,
#             DATEDIFF(CURDATE(), MAX(acl.calling_date)) AS days_since_last_call
#         FROM `tabAgent` a
#         LEFT JOIN `tabAgent Activation Call Log` acl
#             ON acl.agent = a.name AND acl.docstatus = 1
#         WHERE a.name NOT IN (
#             SELECT agent FROM `tabAgent Activation Call Log`
#             WHERE docstatus = 1 AND (exited = 1 OR want_to_exit = 1)
#             AND agent IS NOT NULL
#         )
#         GROUP BY a.name, a.agent_name, a.branch_name
#         HAVING last_call_date IS NULL
#             OR DATEDIFF(CURDATE(), MAX(acl.calling_date)) >= 90
#         ORDER BY days_since_last_call DESC
#         """,
#         as_dict=True,
#     )
#     if not inactive_agents:
#         return
#     trainer_heads = frappe.get_all(
#         "Has Role", filters={"role": "Trainer Head", "parenttype": "User"}, pluck="parent"
#     )
#     if not trainer_heads:
#         return
#     rows = "".join(
#         f"<tr><td>{a.agent_code}</td><td>{a.agent_name}</td><td>{a.branch_name or '-'}</td>"
#         f"<td>{a.last_call_date or 'Never'}</td><td>{a.days_since_last_call or '90+'}</td></tr>"
#         for a in inactive_agents
#     )
#     message = f"""
#         <p>{len(inactive_agents)} SS(s) inactive for 90+ days.</p>
#         <table border="1" cellpadding="4">
#             <thead><tr><th>Code</th><th>Name</th><th>Branch</th><th>Last Call</th><th>Days</th></tr></thead>
#             <tbody>{rows}</tbody>
#         </table>
#     """
#     for user in trainer_heads:
#         frappe.sendmail(
#             recipients=[user],
#             subject=f"Inactive SS Alert — {len(inactive_agents)} SS(s) inactive for 90+ days",
#             message=message,
#         )
