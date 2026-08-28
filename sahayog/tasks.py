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
        # Do NOT clamp to fy_start — if prev expired mid-year (e.g. Jan 31),
        # the new allocation must start Feb 1, not Apr 1.
        from_date = add_days(prev.to_date, 1)
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
    first_of_month = today_date.replace(day=1)
    _, year_end = _fiscal_year_bounds(today_date)

    # Guard: only run on or after the 1st of the month,
    # but allow re-runs (e.g. if scheduler was down on the 1st) up to the 5th.
    # The already_credited check below prevents duplicate credits regardless.
    if today_date.day > 5:
        return

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

            # _get_or_create_yearly_allocation returns a dict; normalise for attribute access
            alloc = frappe._dict(alloc)

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

            # If employee joined after the 20th of the month, no leave credit
            # for that joining month — allocation starts from 1st of next month.
            if emp.date_of_joining.day > 20:
                from calendar import monthrange as _mr
                doj = emp.date_of_joining
                # Move to 1st of next month
                if doj.month == 12:
                    first_of_next = getdate(f"{doj.year + 1}-01-01")
                else:
                    first_of_next = getdate(f"{doj.year}-{doj.month + 1:02d}-01")
                # If next month's 1st is still in the future, skip for now —
                # monthly_leave_credit will handle it on that date.
                if first_of_next > today_date:
                    continue
                # Use first_of_next as-is — do NOT clamp to fy_start.
                # fy_start clamping would wrongly push a Jan/Feb/Mar joiner's
                # allocation to April of the next FY.
                from_date = first_of_next
                new_leaves = rate  # full rate, first credit on next month's 1st
            elif (
                emp.date_of_joining.year == today_date.year
                and emp.date_of_joining.month == today_date.month
            ):
                # Joined this month on or before the 20th — pro-rata
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
            from sahayog.api.leave import _delete_advance_deduction
            _delete_advance_deduction(doc.name)
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



def auto_process_relieved_employees():
    """
    Daily scheduled task (runs at 2:00 AM):
    Find all Active employees whose relieving_date is in the past (<= today),
    set their status to 'Left', and disable their linked User accounts (enabled = 0).
    """
    current_date = getdate(today())
    
    # Fetch employees who are Active but relieving_date has passed
    relieved_employees = frappe.db.get_all(
        "Employee",
        filters={
            "status": "Active",
            "relieving_date": ["<=", current_date],
        },
        fields=["name", "employee_name", "user_id", "relieving_date"],
    )

    if not relieved_employees:
        return

    processed_count = 0
    errors = []

    for emp in relieved_employees:
        try:
            # 1. Update Employee status to 'Left'
            frappe.db.set_value("Employee", emp.name, "status", "Left", update_modified=True)

            # 2. Disable linked User account
            if emp.user_id and frappe.db.exists("User", emp.user_id):
                frappe.db.set_value("User", emp.user_id, "enabled", 0, update_modified=True)

            processed_count += 1
        except Exception as e:
            errors.append(f"Employee: {emp.name} ({emp.employee_name or ''}) - Error: {str(e)}")

    frappe.db.commit()

    # Log single consolidated error log if there were any failures
    if errors:
        frappe.log_error(
            message=f"Auto Process Relieved Employees encountered {len(errors)} error(s):\n\n" + "\n".join(errors),
            title="Auto Process Relieved Employees - Consolidated Errors"
        )

    frappe.logger("scheduler").info(
        f"auto_process_relieved_employees: Processed {processed_count} employees to status 'Left'. Errors: {len(errors)}"
    )


