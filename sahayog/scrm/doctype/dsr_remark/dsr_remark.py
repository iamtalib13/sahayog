# Copyright (c) 2025
# Developer Team and contributors

import frappe
from frappe.model.document import Document


class DSRRemark(Document):
    pass


@frappe.whitelist()
def create_or_update_dsr_remark(
    date,
    employee,
    remark=None,
    employee_name=None,
    sol_id=None,
    branch=None,
    designation=None,
    total_leads=None,
    converted_leads=None,
    followup_leads=None,
    not_interested_leads=None,
    dsr_rating=None,
    dsr_qualification=None
):
    """
    Creates/Updates DSR parent for Branch Manager
    and saves/updates CHILD ROW for the clicked employee.
    """

    # -------------------------
    # 1️⃣ FETCH LOGGED-IN BRANCH MANAGER
    # -------------------------
    logged_user = frappe.session.user

    manager = frappe.get_value(
        "Employee",
        {"user_id": logged_user},
        ["name", "employee_name", "sol_id"],
        as_dict=True
    )

    if not manager:
        frappe.throw("Branch Manager Employee record not found.")

    # Parent identity
    parent_emp_id = manager.name
    parent_emp_name = manager.employee_name
    parent_sol_id = manager.sol_id

    # -------------------------
    # 2️⃣ VALIDATE CLICKED EMPLOYEE
    # -------------------------
    emp_record = frappe.get_value(
        "Employee",
        employee,
        ["name", "employee_name"],
        as_dict=True
    )
    if not emp_record:
        frappe.throw(f"Employee {employee} not found.")

    # fallback
    employee_name = employee_name or emp_record.employee_name

    # -------------------------
    # 3️⃣ GENERATE OR FETCH DSR PARENT
    # -------------------------
    dsr_name = f"DSR-{parent_sol_id}-{date}"

    if frappe.db.exists("DSR Remark", dsr_name):
        dsr_doc = frappe.get_doc("DSR Remark", dsr_name)
    else:
        dsr_doc = frappe.new_doc("DSR Remark")
        dsr_doc.name = dsr_name
        dsr_doc.employee_id = parent_emp_id
        dsr_doc.employee_name = parent_emp_name
        dsr_doc.sol_id = parent_sol_id
        dsr_doc.date = date

    # -------------------------
    # 4️⃣ ADD / UPDATE CHILD ROW FOR THE CLICKED EMPLOYEE
    # -------------------------
    updated = False

    for row in dsr_doc.dsr_employee_details:
        if row.employee_id == employee:
            row.employee_name = employee_name
            row.sol_id = sol_id
            row.branch = branch
            row.designation = designation
            row.total_leads = total_leads
            row.converted_leads = converted_leads
            row.followup_leads = followup_leads
            row.not_interested_leads = not_interested_leads
            row.dsr_rating = dsr_rating
            row.dsr_qualification = dsr_qualification
            row.remark = remark or ""
            updated = True
            break

    if not updated:
        dsr_doc.append("dsr_employee_details", {
            "employee_id": employee,
            "employee_name": employee_name,
            "sol_id": sol_id,
            "branch": branch,
            "designation": designation,
            "total_leads": total_leads,
            "converted_leads": converted_leads,
            "followup_leads": followup_leads,
            "not_interested_leads": not_interested_leads,
            "dsr_rating": dsr_rating,
            "dsr_qualification": dsr_qualification,
            "remark": remark or ""
        })

    # -------------------------
    # 5️⃣ SAVE DOCUMENT
    # -------------------------
    dsr_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "status": "success",
        "message": f"Remark saved for {employee_name}",
        "employee": employee_name
    }


@frappe.whitelist()
def get_dsr_remark(date):
    """
    Check if parent DSR exists for logged-in manager.
    """
    user = frappe.session.user
    emp = frappe.get_value(
        "Employee",
        {"user_id": user},
        ["name", "sol_id"],
        as_dict=True
    )

    if not emp:
        frappe.throw("Employee record not found for logged-in user.")

    sol_id = emp.sol_id

    exists = frappe.get_value(
        "DSR Remark",
        {"sol_id": sol_id, "date": date},
        "name"
    )

    return {"exists": True} if exists else {"exists": False}
