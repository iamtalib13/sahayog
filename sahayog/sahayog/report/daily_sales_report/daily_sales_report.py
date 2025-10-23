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

    # Get selected date from filters
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
        # Get current branch manager's employee record
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "employee_name", "sol_id"],
            as_dict=True
        )
        if not employee:
            frappe.throw("No Employee record found for the current user.")

        # Get branch name from Sahayog Branch using manager’s SOL ID
        branch_info = frappe.db.get_value(
            "Sahayog Branch",
            {"sol_id": employee.sol_id},
            ["branch"],
            as_dict=True
        )
        if not branch_info:
            frappe.throw(f"No branch found in 'Sahayog Branch' for SOL ID {employee.sol_id}")

        branch = branch_info.branch

        # Get all employees mapped to this branch via Sahayog Branch
        employees = []
        sahayog_branches = frappe.get_all(
            "Sahayog Branch",
            filters={"branch": branch},
            fields=["sol_id"]
        )

        sol_ids = [b.sol_id for b in sahayog_branches if b.sol_id]
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
    # STEP 2: Build Data for Each Employee
    # -------------------------------
    data = []

    for emp in employees:
        # Get branch name from Sahayog Branch for each employee
        branch_name = frappe.db.get_value(
            "Sahayog Branch",
            {"sol_id": emp.sol_id},
            "branch"
        ) or "Not Mapped"

        # Get leads for selected date
        leads = frappe.get_list(
            "Lead",
            filters={
                "lead_owner": emp.user_id,
                "sol_id": emp.sol_id,
                "creation": ["between", [selected_date, selected_date]]
            },
            fields=["status"],
            limit_page_length=None
        )

        total_leads = len(leads)
        converted_leads = sum(1 for l in leads if l.status == "Converted")
        followup_leads = sum(1 for l in leads if l.status == "Follow Up")
        not_interested_leads = sum(1 for l in leads if l.status == "Not Interested")

        # Rating logic
        if converted_leads >= 1:
            dsr_rating = "Good"
        elif followup_leads >= 4 and converted_leads == 0:
            dsr_rating = "Average"
        else:
            dsr_rating = "Bad"

         # Qualification
        dsr_qualification = "Qualified" if total_leads >= 10 else "Disqualified"

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
        })

    # ✅ Sort by total leads descending (highest first)
    data.sort(key=lambda x: x["total_leads"], reverse=True)

    # -------------------------------
    # STEP 3: Report Columns
    # -------------------------------
    columns = [
        {"label": "SOL ID", "fieldname": "sol_id", "fieldtype": "Data", "width": 100},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Link", "options": "Branch", "width": 100},
        {"label": "Emp ID", "fieldname": "employee_number", "fieldtype": "Data", "width": 100},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 150},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 120},
        {"label": "Total Leads", "fieldname": "total_leads", "fieldtype": "Int", "width": 100},
        {"label": "Converted Leads", "fieldname": "converted_leads", "fieldtype": "Int", "width": 100},
        {"label": "Follow-up Leads", "fieldname": "followup_leads", "fieldtype": "Int", "width": 100},
        {"label": "Not Interested Leads", "fieldname": "not_interested_leads", "fieldtype": "Int", "width": 100},
        {"label": "DSR Rating", "fieldname": "dsr_rating", "fieldtype": "Data", "width": 120},
        {"label": "DSR Qualification", "fieldname": "dsr_qualification", "fieldtype": "Data", "width": 150},
        {"label": "Remarks", "fieldname": "remarks", "fieldtype": "Data", "width": 200}
    ]

    return columns, data