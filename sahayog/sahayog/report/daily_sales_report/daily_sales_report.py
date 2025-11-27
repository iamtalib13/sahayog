import frappe
from frappe.utils import today, escape_html

def execute(filters=None):
    if not filters:
        filters = {}

    selected_date = filters.get("date") or today()
    user = frappe.session.user
    user_roles = frappe.get_roles(user)

    # =====================================================
    # ROLE FILTERING
    # =====================================================
    if "Administrator" in user_roles or "Sales Manager" in user_roles:
        # Admin & Sales Manager see all employees
        employees = frappe.get_all(
            "Employee",
            fields=["name", "employee_name", "employee_number", "designation", "sol_id", "user_id"]
        )

    elif "Branch Manager" in user_roles:
        me = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "sol_id"],
            as_dict=True
        )
        if not me:
            frappe.throw("No Employee assigned to current user.")

        # get branch
        branch = frappe.db.get_value("Sahayog Branch", {"sol_id": me.sol_id}, "branch")
        sol_ids = frappe.get_all("Sahayog Branch", filters={"branch": branch}, pluck="sol_id")

        employees = frappe.get_all(
            "Employee",
            filters={"sol_id": ["in", sol_ids]},
            fields=["name", "employee_name", "employee_number", "designation", "sol_id", "user_id"]
        )

    else:
        frappe.throw("You do not have permission to view this report.")

    # =====================================================
    # LOAD REMARKS MAP
    # =====================================================
    remarks_map = {}
    dsr_docname = frappe.db.get_value("DSR Remark", {"date": selected_date}, "name")

    if dsr_docname:
        dsr = frappe.get_doc("DSR Remark", dsr_docname)
        for row in dsr.dsr_employee_details:
            emp_no = frappe.db.get_value("Employee", row.employee_id, "employee_number")
            if emp_no:
                remarks_map[emp_no] = row.remark or ""

    # =====================================================
    # DATA BUILDING
    # =====================================================
    data = []

    for emp in employees:
        branch_name = frappe.db.get_value("Sahayog Branch", {"sol_id": emp.sol_id}, "branch") or "Not Mapped"

        leads = frappe.get_all(
            "Lead",
            filters={
                "lead_owner": emp.user_id,
                "sol_id": emp.sol_id,
                "creation": ["between", [f"{selected_date} 00:00:00", f"{selected_date} 23:59:59"]],
            },
            fields=["status"],
        )

        total = len(leads)
        converted = sum(1 for l in leads if l.status == "Converted")
        followup = sum(1 for l in leads if l.status == "Follow Up")
        notint = sum(1 for l in leads if l.status == "Not Interested")

        if converted >= 1:
            rating = "Good"
        elif followup >= 4 and converted == 0:
            rating = "Average"
        else:
            rating = "Bad"

        qualify = "Qualified" if total >= 10 else "Disqualified"

        existing_remark = remarks_map.get(emp.employee_number, "")

        # =========================================
        # BUTTON RENDERING
        # =========================================
        if existing_remark:
            btn_label = "View Remark"
        else:
            btn_label = "Add Remark"

        remark_cell = (
            f"<button class='remark-btn' "
            f"data-emp='{emp.employee_number}' "
            f"style='background:#e6f3ff; color:#1f5faa; border:1px solid #c6dcf8; "
            f"border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer;'>"
            f"{btn_label}</button>"
        )

        data.append({
            "sol_id": emp.sol_id,
            "branch": branch_name,
            "employee_number": emp.employee_number,
            "employee_name": emp.employee_name,
            "designation": emp.designation,
            "total_leads": total,
            "converted_leads": converted,
            "followup_leads": followup,
            "not_interested_leads": notint,
            "dsr_rating": rating,
            "dsr_qualification": qualify,
            "existing_remark": existing_remark,
            "remarks": remark_cell,
        })

    # SORTING
    data.sort(key=lambda x: x["total_leads"], reverse=True)

    # =====================================================
    # COLUMNS
    # =====================================================
    columns = [
        {"label": "SOL ID", "fieldname": "sol_id", "fieldtype": "Data", "width": 90},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "HTML", "width": 160},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 120},
        {"label": "Emp ID", "fieldname": "employee_number", "fieldtype": "Data", "width": 100},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 150},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 120},
        {"label": "Total Leads", "fieldname": "total_leads", "fieldtype": "Int", "width": 90},
        {"label": "Converted", "fieldname": "converted_leads", "fieldtype": "Int", "width": 90},
        {"label": "Follow-up", "fieldname": "followup_leads", "fieldtype": "Int", "width": 90},
        {"label": "Not Interested", "fieldname": "not_interested_leads", "fieldtype": "Int", "width": 130},
        {"label": "DSR Rating", "fieldname": "dsr_rating", "fieldtype": "Data", "width": 90},
        {"label": "DSR Qualification", "fieldname": "dsr_qualification", "fieldtype": "Data", "width": 130},
    ]

    return columns, data
