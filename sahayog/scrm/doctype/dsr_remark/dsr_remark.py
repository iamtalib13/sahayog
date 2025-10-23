# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DSRRemark(Document):
	pass

# Create or update DSR Remark Document
@frappe.whitelist()
def create_or_update_dsr_remark(date, employee, remark=None):
    """
    Update specific employee's remark in child table only.
    No common remark - only individual employee remarks in child table.
    """
    # Get employee details
    emp_details = frappe.get_value(
        "Employee",
        employee,
        ["name", "employee_name", "sol_id", "user_id"],
        as_dict=True
    )
    if not emp_details:
        frappe.throw(f"Employee {employee} not found.")

    sol_id = emp_details.sol_id
    name = f"DSR-{sol_id}-{date}"

    # ✅ Get or create DSR document
    if frappe.db.exists("DSR Remark", name):
        dsr_doc = frappe.get_doc("DSR Remark", name)
    else:
        # Create new DSR document (without common remarks field)
        dsr_doc = frappe.new_doc("DSR Remark")
        dsr_doc.name = name
        dsr_doc.employee_id = emp_details.name
        dsr_doc.employee_name = emp_details.employee_name
        dsr_doc.sol_id = sol_id
        dsr_doc.date = date
        # ✅ No common remarks field - only child table

    # ✅ Find and update specific employee's remark in child table
    updated = False
    for row in dsr_doc.dsr_employee_details:
        if row.employee_id == employee:
            row.remark = remark or ""  # ✅ Update only this employee's remark
            updated = True
            break
    
    # ✅ If employee row doesn't exist in child table, create it
    if not updated:
        # Get employee performance data
        leads = frappe.get_all(
            "Lead",
            filters={
                "lead_owner": emp_details.user_id,
                "creation": ["between", [f"{date} 00:00:00", f"{date} 23:59:59"]]
            },
            fields=["status"]
        )

        total_leads = len(leads)
        converted_leads = sum(1 for l in leads if l.status == "Converted")
        followup_leads = sum(1 for l in leads if l.status == "Follow Up")
        not_interested_leads = sum(1 for l in leads if l.status == "Do Not Contact")

        dsr_rating = "Good" if converted_leads >= 1 else "Average" if followup_leads >= 4 else "Bad"
        dsr_qualification = "Qualified" if total_leads >= 10 else "Disqualified"
        branch_name = frappe.db.get_value("Sahayog Branch", {"sol_id": sol_id}, "branch") or "Not Mapped"

        # ✅ Add new row in child table with individual remark
        dsr_doc.append("dsr_employee_details", {
            "employee_id": emp_details.name,
            "employee_name": emp_details.employee_name,
            "sol_id": emp_details.sol_id,
            "branch": branch_name,
            "designation": frappe.db.get_value("Employee", employee, "designation"),
            "total_leads": total_leads,
            "converted_leads": converted_leads,
            "followup_leads": followup_leads,
            "not_interested_leads": not_interested_leads,
            "dsr_rating": dsr_rating,
            "dsr_qualification": dsr_qualification,
            "remark": remark or ""  # ✅ Individual employee remark
        })

    # Save document
    dsr_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "status": "success", 
        "message": f"Remark updated for {emp_details.employee_name}",
        "employee": emp_details.employee_name
    }


@frappe.whitelist()
def get_dsr_remark(date):
    """
    Fetch existing DSR Remark for current Branch Manager by SOL ID + date.
    """
    user = frappe.session.user
    employee = frappe.get_value("Employee", {"user_id": user}, ["name", "sol_id"], as_dict=True)
    if not employee:
        frappe.throw("No Employee record found for the current user.")

    sol_id = employee.sol_id

    remark_doc = frappe.get_all(
        "DSR Remark",
        filters={"sol_id": sol_id, "date": date},
        fields=["remarks", "name"],
        limit_page_length=1
    )

    if remark_doc:
        return {"exists": True, "remark": remark_doc[0].remarks}
    else:
        return {"exists": False, "remark": ""}