"""
Sahayog Payroll Management API
Minimal payroll system for support staff
"""

import frappe
from frappe import _, msgprint
from frappe.utils import flt, nowdate, getdate
from frappe.utils.csvutils import build_csv_response


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
    
    # Get active support staff
    filters = {
        "custom_is_support_staff": 1,
        "status": "Active"
    }
    
    if payroll.branch_filter:
        filters["sahayog_branch"] = payroll.branch_filter
    
    employees = frappe.get_all(
        "Employee",
        filters=filters,
        fields=[
            "name", "employee_name", "sahayog_branch", "designation",
            "ctc", "custom_medical_deduction", "custom_staff_loan_emi",
            "bank_name", "bank_ac_no"
        ]
    )
    
    if not employees:
        frappe.throw(_("No active support staff found"))
    
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
            gross = flt(emp.get("ctc", 0))
            
            if gross <= 0:
                errors.append(f"{emp.name} - {emp.employee_name}: CTC not set")
                continue
            
            medical = flt(emp.get("custom_medical_deduction", 0))
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
                "gross_salary": gross,
                "medical_deduction": medical,
                "staff_loan_emi": loan,
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
            "gross_salary", "medical_deduction", "staff_loan_emi",
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
            "gross_salary", "medical_deduction", "staff_loan_emi",
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
        {"component": "Basic Salary", "amount": salary_reg.gross_salary}
    ]
    
    # Build deductions list
    deductions = []
    if flt(salary_reg.medical_deduction) > 0:
        deductions.append({"component": "Medical Deduction", "amount": salary_reg.medical_deduction})
    if flt(salary_reg.staff_loan_emi) > 0:
        deductions.append({"component": "Staff Loan EMI", "amount": salary_reg.staff_loan_emi})
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
    """
    Generate bank payment CSV file
    """
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)
    
    # Get salary register data
    data = get_salary_register_list(payroll_month, branch)
    
    # Prepare CSV data
    csv_data = []
    csv_data.append([
        "Employee Code", "Employee Name", "Designation", "Branch",
        "Bank Name", "Account Number", "Gross Salary",
        "Medical Deduction", "Loan EMI", "Other Deduction",
        "Total Deduction", "Net Salary"
    ])
    
    for row in data["data"]:
        csv_data.append([
            row["employee"],
            row["employee_name"],
            row["designation"] or "",
            row["branch"] or "",
            row["bank_name"] or "",
            row["bank_account_no"] or "",
            f"{row['gross_salary']:.2f}",
            f"{row['medical_deduction']:.2f}",
            f"{row['staff_loan_emi']:.2f}",
            f"{row['other_deduction']:.2f}",
            f"{row['total_deductions']:.2f}",
            f"{row['net_salary']:.2f}"
        ])
    
    # Build CSV response
    build_csv_response(csv_data, f"salary_payment_{payroll_month}")


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
    
    frappe.db.commit()
    
    return {
        "success": True,
        "message": _("Payroll marked as PAID. Payment recorded for {0}.").format(payroll.payroll_month)
    }
