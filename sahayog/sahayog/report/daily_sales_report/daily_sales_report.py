import frappe
from frappe.utils import today

def execute(filters=None):
    """
    DSR Report with role-wise access:
    - Administrator: sees all employees
    - Branch Manager: sees only employees in their branch
    """

    if not filters:
        filters = {}

    selected_date = filters.get("date") or today()
    user = frappe.session.user
    user_roles = frappe.get_roles(user)

    # -------------------------------
    # STEP 1: Get Employees based on Role
    # -------------------------------
    if "Administrator" in user_roles:
        employees = frappe.get_list(
            "Employee",
            fields=["name", "employee_name", "employee_number", "designation", "sol_id", "user_id"],
            limit_page_length=None
        )
        branch = "All Branches"

    elif "Branch Manager" in user_roles:
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "employee_name", "sol_id"],
            as_dict=True
        )
        if not employee:
            frappe.throw("No Employee record found for the current user.")

        branch_info = frappe.db.get_value(
            "Sahayog Branch",
            {"sol_id": employee.sol_id},
            ["branch"],
            as_dict=True
        )
        if not branch_info:
            frappe.throw(f"No branch found in 'Sahayog Branch' for SOL ID {employee.sol_id}")

        branch = branch_info.branch

        sahayog_branches = frappe.get_all(
            "Sahayog Branch",
            filters={"branch": branch},
            fields=["sol_id"]
        )

        sol_ids = [b.sol_id for b in sahayog_branches if b.sol_id]

        employees = []
        if sol_ids:
            employees = frappe.get_list(
                "Employee",
                filters={"sol_id": ["in", sol_ids]},
                fields=["name", "employee_name", "employee_number", "designation", "sol_id", "user_id"],
                limit_page_length=None
            )
    else:
        frappe.throw("You do not have permission to view this report.")

    # -------------------------------
    # STEP 2: Load existing remarks for this date
    # -------------------------------
    # Map by employee_number for easy lookup when building report rows
    remarks_map = {}     # employee_number -> remark

    # Find DSR Remark document for the selected date (we're not restricting by sol_id here;
    # if you want per-branch manager DSR, add sol_id filter)
    dsr_docname = frappe.db.get_value("DSR Remark", {"date": selected_date}, "name")

    if dsr_docname:
        dsr = frappe.get_doc("DSR Remark", dsr_docname)
        for row in dsr.dsr_employee_details:
            # Try to fetch employee_number for the child row's employee_id (which is Employee docname)
            try:
                emp_no = frappe.db.get_value("Employee", row.employee_id, "employee_number")
            except Exception:
                emp_no = None

            if emp_no:
                remarks_map[emp_no] = row.remark or ""
            # Also map by employee_id (fallback)
            remarks_map[row.employee_id] = row.remark or ""

    # -------------------------------
    # STEP 3: Build Data for Each Employee
    # -------------------------------
    data = []

    for emp in employees:
        branch_name = frappe.db.get_value(
            "Sahayog Branch",
            {"sol_id": emp.sol_id},
            "branch"
        ) or "Not Mapped"

        # Get leads for selected date (use full-day timestamps)
        leads = frappe.get_list(
            "Lead",
            filters={
                "lead_owner": emp.user_id,
                "sol_id": emp.sol_id,
                "creation": ["between", [f"{selected_date} 00:00:00", f"{selected_date} 23:59:59"]]
            },
            fields=["status"],
            limit_page_length=None
        )

        total_leads = len(leads)
        converted_leads = sum(1 for l in leads if l.status == "Converted")
        followup_leads = sum(1 for l in leads if l.status == "Follow Up")
        not_interested_leads = sum(1 for l in leads if l.status == "Not Interested")

        if converted_leads >= 1:
            dsr_rating = "Good"
        elif followup_leads >= 4 and converted_leads == 0:
            dsr_rating = "Average"
        else:
            dsr_rating = "Bad"

        dsr_qualification = "Qualified" if total_leads >= 10 else "Disqualified"

        # -------------------------------
        # ⭐ Prepare remark cell HTML: show remark text or Add Remark button
        # -------------------------------
        # Prefer lookup by employee_number; fallback to employee docname
        existing_remark = remarks_map.get(emp.employee_number) or remarks_map.get(emp.name) or ""

        if existing_remark:
            # Display escaped remark text (simple escape)
            safe_remark = frappe.utils.escape_html(existing_remark)
            remark_cell = f"<div class='existing-remark'>{safe_remark}</div>"
        else:
            # Button: we'll attach JS click handlers to buttons by class and data attributes
            # store employee_number in data-emp for client-side handler to find row
            remark_cell = (
                f"<button class='add-remark-btn' data-emp='{emp.employee_number}' "
                f"data-emp-name='{frappe.utils.escape_html(emp.employee_name)}' "
                f"data-sol='{emp.sol_id}' "
                f"style='background:#e7f0ff; color:#2b6cb0; border:1px solid #cdddfc; "
                f"border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer;'>"
                f"Add Remark</button>"
            )


        data.append({
            "sol_id": emp.sol_id,
            "branch": branch_name,
            "employee_number": emp.employee_number,
            "employee_name": emp.employee_name,
            "designation": emp.designation,
            "total_leads": total_leads,
            "converted_leads": converted_leads,
            "followup_leads": followup_leads,
            "not_interested_leads": not_interested_leads,
            "dsr_rating": dsr_rating,
            "dsr_qualification": dsr_qualification,
            "remarks": remark_cell     # HTML for report cell
        })

    data.sort(key=lambda x: x["total_leads"], reverse=True)

    # -------------------------------
    # STEP 4: Columns (NO ACTION COLUMN)
    # -------------------------------
    columns = [
        {"label": "SOL ID", "fieldname": "sol_id", "fieldtype": "Data", "width": 100},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "HTML", "width": 150},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 120},
        {"label": "Emp ID", "fieldname": "employee_number", "fieldtype": "Data", "width": 100},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 150},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 120},
        {"label": "Total Leads", "fieldname": "total_leads", "fieldtype": "Int", "width": 100},
        {"label": "Converted Leads", "fieldname": "converted_leads", "fieldtype": "Int", "width": 100},
        {"label": "Follow-up Leads", "fieldname": "followup_leads", "fieldtype": "Int", "width": 100},
        {"label": "Not Interested Leads", "fieldname": "not_interested_leads", "fieldtype": "Int", "width": 120},
        {"label": "DSR Rating", "fieldname": "dsr_rating", "fieldtype": "Data", "width": 120},
        {"label": "DSR Qualification", "fieldname": "dsr_qualification", "fieldtype": "Data", "width": 150},
    ]

    return columns, data
