"""
Sahayog Payroll Management API
Minimal payroll system for support staff
"""

import frappe
from frappe import _, msgprint
from frappe.utils import flt, nowdate, getdate
from frappe.utils.csvutils import build_csv_response


def _payroll_attendance_cycle(payroll_month):
    """Attendance cycle (26th prev-month → 25th payroll-month) for a YYYY-MM payroll month."""
    year, month = int(payroll_month[:4]), int(payroll_month[5:7])
    if month == 1:
        start = getdate(f"{year - 1}-12-26")
    else:
        start = getdate(f"{year}-{month - 1:02d}-26")
    end = getdate(f"{year}-{month:02d}-25")
    return start, end


def _prev_payroll_month(payroll_month):
    year, month = int(payroll_month[:4]), int(payroll_month[5:7])
    if month == 1:
        return f"{year - 1}-12"
    return f"{year}-{month - 1:02d}"


def _month_days(payroll_month):
    """Calendar days of the payroll month (HR per-day rate = monthly / this)."""
    from calendar import monthrange
    year, month = int(payroll_month[:4]), int(payroll_month[5:7])
    return monthrange(year, month)[1]


def _unmarked_days(employee, start, end, doj=None, lwd=None):
    """Past service days in cycle with no Attendance record (info only).

    Future days are excluded (not yet due). These days are paid-in-advance
    and settle via arrears once actually marked.
    """
    today = getdate(nowdate())
    win_start = max(getdate(start), getdate(doj)) if doj else getdate(start)
    win_end = min(getdate(end), today)
    if lwd:
        win_end = min(win_end, getdate(lwd))
    if win_end < win_start:
        return 0
    window_days = (win_end - win_start).days + 1
    recorded = frappe.db.sql(
        """SELECT COUNT(DISTINCT attendance_date) AS c FROM `tabAttendance`
           WHERE employee=%s AND attendance_date BETWEEN %s AND %s AND docstatus != 2""",
        (employee, win_start, win_end), as_dict=True)[0].c or 0
    return max(window_days - recorded, 0)


def _attendance_counts(employee, start, end):
    """(present_days, lop_days) from submitted Attendance in cycle.

    Half Day counts 0.5 present; Absent counts as LOP; approved leave is paid.
    """
    rows = frappe.db.sql(
        """SELECT status, COUNT(*) AS c FROM `tabAttendance`
           WHERE employee=%s AND attendance_date BETWEEN %s AND %s AND docstatus=1
           GROUP BY status""",
        (employee, start, end), as_dict=True,
    )
    counts = {r.status: r.c for r in rows}
    present = flt(counts.get("Present", 0)) + 0.5 * flt(counts.get("Half Day", 0))
    lop = flt(counts.get("Absent", 0))
    return present, lop


@frappe.whitelist()
def create_payroll_run(payroll_month, branch_filter=None):
    """
    Create a new Payroll Run for the month
    HR Manager only
    """
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    
    # Check if payroll already exists
    existing = frappe.db.exists("Payroll Run", {
        "payroll_month": payroll_month,
        "status": ["!=", "Cancelled"]
    })
    
    if existing:
        frappe.throw(_("Payroll for {0} already exists: {1}").format(payroll_month, existing))
    
    # Create Payroll Run
    payroll = frappe.get_doc({
        "doctype": "Payroll Run",
        "payroll_month": payroll_month,
        "posting_date": nowdate(),
        "branch_filter": branch_filter,
        "status": "Draft"
    })
    payroll.insert(ignore_permissions=True)
    
    return {
        "success": True,
        "message": _("Payroll Run {0} created").format(payroll.name),
        "payroll_id": payroll.name
    }


@frappe.whitelist()
def generate_salary_register(payroll_run_id):
    """
    Generate Salary Register entries for all active support staff
    Called from Payroll Run button or Portal
    """
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    
    payroll = frappe.get_doc("Payroll Run", payroll_run_id)
    
    if payroll.status != "Draft":
        frappe.throw(_("Payroll is already generated"))
    
    # Employees applicable for this payroll period:
    # Active all + Left whose last working date falls in/after the cycle
    # (backdated resigned staff are excluded automatically).
    cycle_start, cycle_end = _payroll_attendance_cycle(payroll.payroll_month)

    base = {"custom_is_support_staff": 1}
    if payroll.branch_filter:
        base["sahayog_branch"] = payroll.branch_filter

    emp_fields = [
        "name", "employee_name", "sahayog_branch", "designation",
        "ctc", "custom_medical_deduction", "custom_staff_loan_emi",
        "bank_name", "bank_ac_no", "status",
        "date_of_joining", "relieving_date",
    ]
    employees = frappe.get_all("Employee", filters={**base, "status": "Active"}, fields=emp_fields)
    left_staff = frappe.get_all(
        "Employee",
        filters={**base, "status": "Left", "relieving_date": [">=", cycle_start]},
        fields=emp_fields,
    )
    employees += [e for e in left_staff if e.name not in {x.name for x in employees}]

    if not employees:
        frappe.throw(_("No applicable support staff found for this payroll period"))
    
    # Check if any salary registers already exist
    existing_registers = frappe.get_all("Salary Register", 
        filters={"payroll_run": payroll.name}, 
        limit=1
    )
    
    if existing_registers:
        frappe.throw(_("Salary registers already generated for this payroll run"))
    
    # Generate salary registers
    total_gross = 0
    total_deductions = 0
    total_net = 0
    created_count = 0
    errors = []
    
    for emp in employees:
        try:
            monthly = flt(emp.get("ctc", 0))

            if monthly <= 0:
                errors.append(f"{emp.name} - {emp.employee_name}: CTC not set")
                continue

            # Attendance auto-fetch (26th→25th cycle); approved corrections/
            # leaves already flow in via submitted Attendance records.
            present_days, lop_days = _attendance_counts(emp.name, cycle_start, cycle_end)
            unmarked = _unmarked_days(emp.name, cycle_start, cycle_end,
                                      emp.get("date_of_joining"), emp.get("relieving_date"))
            # Arrear auto-adjustment: salary is processed before the cycle's
            # tail (26th–31st) finalizes, so days paid in advance are settled
            # here. Diff of prev paid LOP vs prev actual LOP → +/− days.
            arrears_days = 0
            prev_month = _prev_payroll_month(payroll.payroll_month)
            prev_lop = frappe.db.get_value(
                "Salary Register",
                {"employee": emp.name, "payroll_month": prev_month}, "lop_days")
            if prev_lop is not None:
                prev_start, prev_end = _payroll_attendance_cycle(prev_month)
                _prev_present, lop_actual = _attendance_counts(emp.name, prev_start, prev_end)
                arrears_days = flt(prev_lop) - flt(lop_actual)
            # HR per-day rate = monthly / calendar days of payroll month
            per_day = monthly / _month_days(payroll.payroll_month)
            gross = monthly - round(per_day * lop_days, 2) + round(per_day * arrears_days, 2)

            medical = flt(emp.get("custom_medical_deduction", 0))
            # Staff Loan EMI: open Staff Loan register wins (auto-reflect);
            # else fall back to the Employee field (existing behavior).
            try:
                from sahayog.api.staff_loan import get_open_emi_total
                loan = get_open_emi_total(emp.name) or flt(emp.get("custom_staff_loan_emi", 0))
            except Exception:
                loan = flt(emp.get("custom_staff_loan_emi", 0))

            total_ded = medical + loan
            net = gross - total_ded

            # Create Salary Register Entry
            salary_reg = frappe.get_doc({
                "doctype": "Salary Register",
                "payroll_run": payroll.name,
                "payroll_month": payroll.payroll_month,
                "employee": emp.name,
                "employee_name": emp.employee_name,
                "branch": emp.sahayog_branch,
                "designation": emp.designation,
                "monthly_gross": monthly,
                "gross_salary": gross,
                "present_days": present_days,
                "lop_days": lop_days,
                "arrears_days": arrears_days,
                "unmarked_days": unmarked,
                "medical_deduction": medical,
                "staff_loan_emi": loan,
                "vehicle_deduction": 0,
                "salary_advance": 0,
                "vl_loan": 0,
                "other_deduction": 0,
                "total_deductions": total_ded,
                "net_salary": net,
                "bank_name": emp.bank_name,
                "bank_account_no": emp.bank_ac_no
            })
            
            salary_reg.insert(ignore_permissions=True)
            
            total_gross += gross
            total_deductions += total_ded
            total_net += net
            created_count += 1
            
        except Exception as e:
            errors.append(f"{emp.name} - {emp.employee_name}: {str(e)}")
    
    # Update Payroll Run summary
    payroll.total_employees = created_count
    payroll.total_gross = total_gross
    payroll.total_deductions = total_deductions
    payroll.total_net_pay = total_net
    payroll.status = "Generated"
    payroll.save(ignore_permissions=True)
    
    frappe.db.commit()
    
    message = _("Generated salary register for {0} employees").format(created_count)
    if errors:
        message += "\n\nErrors:\n" + "\n".join(errors[:5])
        if len(errors) > 5:
            message += f"\n... and {len(errors) - 5} more errors"
    
    return {
        "success": True,
        "message": message,
        "summary": {
            "employees": created_count,
            "total_gross": total_gross,
            "total_deductions": total_deductions,
            "total_net": total_net,
            "errors": errors
        }
    }


@frappe.whitelist()
def get_salary_register_list(payroll_month=None, branch=None):
    """
    Get salary register entries for portal display
    """
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    
    if not payroll_month:
        payroll_month = nowdate()[:7]
    
    # Build filters
    filters = {"payroll_month": payroll_month}
    if branch:
        filters["branch"] = branch
    
    # Fetch salary registers
    registers = frappe.get_all(
        "Salary Register",
        filters=filters,
        fields=[
            "name", "employee", "employee_name", "branch", "designation",
            "monthly_gross", "gross_salary",
            "present_days", "lop_days", "arrears_days", "unmarked_days",
            "medical_deduction", "staff_loan_emi",
            "vehicle_deduction", "salary_advance", "vl_loan",
            "other_deduction", "total_deductions", "net_salary",
            "bank_name", "bank_account_no", "payroll_run"
        ],
        order_by="branch, employee_name"
    )

    # Calculate summary
    summary = {
        "total_employees": len(registers),
        "total_gross": sum(flt(r.gross_salary) for r in registers),
        "total_medical": sum(flt(r.medical_deduction) for r in registers),
        "total_loan": sum(flt(r.staff_loan_emi) for r in registers),
        "total_vehicle": sum(flt(r.vehicle_deduction) for r in registers),
        "total_advance": sum(flt(r.salary_advance) for r in registers),
        "total_vl": sum(flt(r.vl_loan) for r in registers),
        "total_other": sum(flt(r.other_deduction) for r in registers),
        "total_deductions": sum(flt(r.total_deductions) for r in registers),
        "total_net": sum(flt(r.net_salary) for r in registers)
    }
    
    # Branch-wise breakdown
    branch_wise = {}
    for reg in registers:
        b = reg.branch or "Not Set"
        if b not in branch_wise:
            branch_wise[b] = {"count": 0, "gross": 0, "net": 0}
        branch_wise[b]["count"] += 1
        branch_wise[b]["gross"] += flt(reg.gross_salary)
        branch_wise[b]["net"] += flt(reg.net_salary)
    
    branch_list = [
        {"branch": k, "count": v["count"], "gross": v["gross"], "net": v["net"]}
        for k, v in branch_wise.items()
    ]
    branch_list.sort(key=lambda x: x["net"], reverse=True)
    
    # Get payroll run status
    payroll_run = frappe.db.get_value(
        "Payroll Run",
        {"payroll_month": payroll_month},
        ["name", "status"],
        as_dict=True
    )
    
    return {
        "data": registers,
        "summary": summary,
        "branch_wise": branch_list,
        "month": payroll_month,
        "payroll_run": payroll_run
    }


@frappe.whitelist()
def update_salary_deduction(register_id, other_deduction, reason=None):
    """
    Update 'Other Deduction' field for manual adjustments
    """
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    
    salary_reg = frappe.get_doc("Salary Register", register_id)

    # Payroll lock: no edits once submitted/paid (authorized adjustment only)
    run_status = frappe.db.get_value("Payroll Run", salary_reg.payroll_run, "status")
    if run_status in ("Submitted", "Paid"):
        frappe.throw(_("Payroll is {0} and locked. Changes need an authorized adjustment.").format(run_status))

    salary_reg.other_deduction = flt(other_deduction)
    if reason:
        salary_reg.other_deduction_reason = reason
    
    # Recalculate (will be done automatically in validate)
    salary_reg.save(ignore_permissions=True)
    
    return {
        "success": True,
        "message": _("Salary register updated"),
        "net_salary": salary_reg.net_salary
    }


@frappe.whitelist()
def get_employee_salary_slip(employee, payroll_month):
    """
    Get detailed salary slip for an employee
    """
    salary_reg = frappe.db.get_value(
        "Salary Register",
        {"employee": employee, "payroll_month": payroll_month},
        [
            "name", "employee_name", "designation", "branch",
            "monthly_gross", "gross_salary",
            "present_days", "lop_days", "arrears_days", "unmarked_days",
            "medical_deduction", "staff_loan_emi",
            "vehicle_deduction", "salary_advance", "vl_loan",
            "other_deduction", "other_deduction_reason",
            "total_deductions", "net_salary",
            "bank_name", "bank_account_no"
        ],
        as_dict=True
    )

    if not salary_reg:
        frappe.throw(_("Salary register not found for {0} in {1}").format(employee, payroll_month))

    # Build earnings list
    earnings = [
        {"component": "Monthly Gross", "amount": salary_reg.monthly_gross},
        {"component": f"Gross Salary (Present: {salary_reg.present_days} days)", "amount": salary_reg.gross_salary},
    ]
    if flt(salary_reg.arrears_days) != 0:
        earnings.append({"component": f"Arrears ({salary_reg.arrears_days} days, incl. in gross)", "amount": 0})

    # Build deductions list
    deductions = []
    if flt(salary_reg.medical_deduction) > 0:
        deductions.append({"component": "Medical Deduction", "amount": salary_reg.medical_deduction})
    if flt(salary_reg.staff_loan_emi) > 0:
        deductions.append({"component": "Staff Loan EMI", "amount": salary_reg.staff_loan_emi})
    if flt(salary_reg.vehicle_deduction) > 0:
        deductions.append({"component": "Vehicle Deduction", "amount": salary_reg.vehicle_deduction})
    if flt(salary_reg.salary_advance) > 0:
        deductions.append({"component": "Salary Advance", "amount": salary_reg.salary_advance})
    if flt(salary_reg.vl_loan) > 0:
        deductions.append({"component": "VL Loan", "amount": salary_reg.vl_loan})
    if flt(salary_reg.other_deduction) > 0:
        deductions.append({
            "component": "Other Deduction", 
            "amount": salary_reg.other_deduction,
            "reason": salary_reg.other_deduction_reason
        })
    
    return {
        "register": salary_reg,
        "month": payroll_month,
        "earnings": earnings,
        "deductions": deductions
    }


@frappe.whitelist()
def export_bank_payment_csv(payroll_month, branch=None):
    """Salary Register export in HR's 28-column register format."""
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    filters = {"payroll_month": payroll_month}
    if branch:
        filters["branch"] = branch

    rows = frappe.db.sql(
        """SELECT sr.employee, sr.employee_name,
                  e.gender, e.company, e.custom_division, sb.state,
                  e.custom_zone, e.custom_region, sb.branch AS branch_name,
                  e.sol_id, e.department, e.designation,
                  e.date_of_joining, e.final_confirmation_date, e.status,
                  e.resignation_letter_date, e.relieving_date,
                  sr.present_days, sr.lop_days, sr.arrears_days,
                  sr.monthly_gross, sr.gross_salary,
                  sr.medical_deduction, sr.staff_loan_emi, sr.vl_loan,
                  sr.other_deduction, sr.total_deductions, sr.net_salary,
                  sr.bank_account_no
           FROM `tabSalary Register` sr
           LEFT JOIN `tabEmployee` e ON e.name = sr.employee
           LEFT JOIN `tabSahayog Branch` sb ON sb.name = sr.branch
           WHERE sr.payroll_month = %(month)s
             AND (%(branch)s IS NULL OR sr.branch = %(branch)s)
           ORDER BY sr.branch, sr.employee_name""",
        {"month": payroll_month, "branch": branch}, as_dict=True)

    def fmt_date(d):
        return d.strftime("%d/%m/%Y") if d else ""

    csv_data = [[
        "Employee Code", "Employee Name", "Gender", "Company Name",
        "Business Unit", "State", "Zone", "Region", "Branch", "Branch Code",
        "Department", "Designation", "Date Of Joining", "Date Of Confirmation",
        "Employee Status", "Date of Resignation", "Date_Of_Leaving",
        "Days_Worked", "LOP", "Arrears_Days", "Fixed Gross", "Gross_Salary",
        "Medical Deduction", "Staff Loan", "VL Loan", "Other Deduction",
        "Total Deduction", "Net Pay", "Bank Account No",
    ]]
    for r in rows:
        csv_data.append([
            r.employee or "", r.employee_name or "",
            r.gender or "", r.company or "",
            r.custom_division or "", r.state or "",
            r.custom_zone or "", r.custom_region or "",
            r.branch_name or "", r.sol_id or "",
            r.department or "", r.designation or "",
            fmt_date(r.date_of_joining), fmt_date(r.final_confirmation_date),
            r.status or "",
            fmt_date(r.resignation_letter_date), fmt_date(r.relieving_date),
            f"{flt(r.present_days):.1f}", f"{flt(r.lop_days):.1f}",
            f"{flt(r.arrears_days):.1f}",
            f"{flt(r.monthly_gross):.2f}", f"{flt(r.gross_salary):.2f}",
            f"{flt(r.medical_deduction):.2f}", f"{flt(r.staff_loan_emi):.2f}",
            f"{flt(r.vl_loan):.2f}", f"{flt(r.other_deduction):.2f}",
            f"{flt(r.total_deductions):.2f}", f"{flt(r.net_salary):.2f}",
            r.bank_account_no or "",
        ])

    build_csv_response(csv_data, f"salary_register_{payroll_month}")


@frappe.whitelist()
def upload_salary_sheet(payroll_month, rows):
    """HR salary-sheet upload: code-keyed payhead changes + recalculation.

    Editable payheads: monthly_gross, medical_deduction, staff_loan_emi,
    vehicle_deduction, salary_advance, vl_loan, other_deduction (+reason),
    arrears_days. Gross is recomputed (monthly − LOP + arrears),
    totals/net via Salary Register validate. Only on Draft/Generated runs.
    """
    import json

    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    if isinstance(rows, str):
        rows = json.loads(rows)

    run = frappe.db.get_value("Payroll Run", {"payroll_month": payroll_month},
                              ["name", "status"], as_dict=True)
    if not run:
        frappe.throw(_("No payroll run found for {0}. Generate payroll first.").format(payroll_month))
    if run.status not in ("Draft", "Generated"):
        frappe.throw(_("Payroll is {0} and locked. Changes need an authorized adjustment.").format(run.status))

    PAYHEADS = ("monthly_gross", "gross_salary", "medical_deduction", "staff_loan_emi",
                "vehicle_deduction", "salary_advance", "vl_loan",
                "other_deduction", "arrears_days")
    results = {"updated": 0, "failed": 0, "errors": [], "rows": []}

    for i, row in enumerate(rows, start=2):
        code = (row.get("employee_code") or row.get("employee") or "").strip()
        if not code:
            results["failed"] += 1
            results["errors"].append({"row": i, "employee_code": "", "error": "Missing Employee Code"})
            results["rows"].append({"row": i, "employee_code": "", "status": "Failed"})
            continue
        name = frappe.db.exists("Salary Register", {"payroll_month": payroll_month, "employee": code})
        if not name:
            reason = f"No salary record for {code} in {payroll_month}"
            results["failed"] += 1
            results["errors"].append({"row": i, "employee_code": code, "error": reason})
            results["rows"].append({"row": i, "employee_code": code, "status": "Failed"})
            continue
        try:
            reg = frappe.get_doc("Salary Register", name)
            changed = []
            for head in PAYHEADS:
                if row.get(head) not in (None, ""):
                    reg.set(head, flt(row.get(head)))
                    changed.append(head)
            if row.get("other_reason") not in (None, ""):
                reg.other_deduction_reason = row.get("other_reason")
                changed.append("other_deduction_reason")
            if not changed:
                results["rows"].append({"row": i, "employee_code": code, "status": "Skipped (No Changes)"})
                continue
            # Recompute pro-rata gross from monthly/LOP/arrears, then save (recalcs totals).
            # Direct gross_salary in the sheet always wins (HR override).
            if "gross_salary" not in changed and ("monthly_gross" in changed or "arrears_days" in changed):
                per_day = flt(reg.monthly_gross) / _month_days(payroll_month)
                reg.gross_salary = (flt(reg.monthly_gross)
                                    - round(per_day * flt(reg.lop_days), 2)
                                    + round(per_day * flt(reg.arrears_days), 2))
            reg.save(ignore_permissions=True)
            results["updated"] += 1
            results["rows"].append({"row": i, "employee_code": code,
                                    "status": f"Updated ({', '.join(changed)})"})
        except Exception as e:
            frappe.db.rollback()
            results["failed"] += 1
            results["errors"].append({"row": i, "employee_code": code, "error": str(e)})
            results["rows"].append({"row": i, "employee_code": code, "status": "Failed"})

    frappe.db.commit()

    # Refresh run totals
    totals = frappe.db.sql(
        """SELECT COUNT(*), SUM(gross_salary), SUM(total_deductions), SUM(net_salary)
           FROM `tabSalary Register` WHERE payroll_run=%s""", run.name)[0]
    frappe.db.set_value("Payroll Run", run.name, {
        "total_employees": totals[0] or 0, "total_gross": totals[1] or 0,
        "total_deductions": totals[2] or 0, "total_net_pay": totals[3] or 0})

    return results


PT_TEMPLATE_COLUMNS = [
    "employee_code", "monthly_gross", "gross_salary", "medical_deduction", "staff_loan_emi",
    "vehicle_deduction", "salary_advance", "vl_loan",
    "other_deduction", "other_reason", "arrears_days",
]


@frappe.whitelist()
def submit_payroll_run(payroll_run_id):
    """
    Submit/Finalize payroll run - locks the payroll
    HR Manager only
    """
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    
    payroll = frappe.get_doc("Payroll Run", payroll_run_id)
    
    if payroll.status != "Generated":
        frappe.throw(_("Only Generated payroll can be submitted"))
    
    # Validate all salary registers exist
    register_count = frappe.db.count("Salary Register", {"payroll_run": payroll.name})
    
    if register_count == 0:
        frappe.throw(_("No salary registers found. Generate payroll first."))
    
    # Change status to Submitted
    payroll.status = "Submitted"
    payroll.save(ignore_permissions=True)
    
    frappe.db.commit()
    
    return {
        "success": True,
        "message": _("Payroll submitted successfully for {0} employees. Ready for payment processing.").format(register_count)
    }


@frappe.whitelist()
def mark_payroll_paid(payroll_run_id):
    """
    Mark payroll as paid - records payment completion
    HR Manager only
    """
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    
    payroll = frappe.get_doc("Payroll Run", payroll_run_id)
    
    if payroll.status != "Submitted":
        frappe.throw(_("Only Submitted payroll can be marked as paid"))
    
    # Change status to Paid
    payroll.status = "Paid"
    payroll.save(ignore_permissions=True)

    # Auto-settle staff loans from paid EMIs (balance update + auto-close)
    try:
        from sahayog.api.staff_loan import settle_loans_on_paid
        registers = frappe.get_all(
            "Salary Register", filters={"payroll_run": payroll.name},
            fields=["employee", "staff_loan_emi"])
        for reg in registers:
            if flt(reg.staff_loan_emi) > 0:
                settle_loans_on_paid(reg.employee, reg.staff_loan_emi,
                                     payroll.payroll_month, payroll.name)
    except Exception as e:
        frappe.log_error(f"Loan settlement failed for {payroll.name}: {e}",
                         "Payroll Loan Settlement")

    frappe.db.commit()
    
    return {
        "success": True,
        "message": _("Payroll marked as PAID. Payment recorded for {0}.").format(payroll.payroll_month)
    }
