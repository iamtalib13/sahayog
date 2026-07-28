import frappe
from frappe.utils import today


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
            fields=[
                "name",
                "employee_name",
                "employee_number",
                "designation",
                "sol_id",
                "user_id",
            ],
        )

    elif "Branch Manager" in user_roles:
        me = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "sol_id"],
            as_dict=True,
        )
        if not me:
            frappe.throw("No Employee assigned to current user.")

        # get branch
        branch = frappe.db.get_value(
            "Sahayog Branch", {"sol_id": me.sol_id}, "branch"
        )
        sol_ids = frappe.get_all(
            "Sahayog Branch", filters={"branch": branch}, pluck="sol_id"
        )

        employees = frappe.get_all(
            "Employee",
            filters={"sol_id": ["in", sol_ids]},
            fields=[
                "name",
                "employee_name",
                "employee_number",
                "designation",
                "sol_id",
                "user_id",
            ],
        )

    else:
        frappe.throw("You do not have permission to view this report.")

    # =====================================================
    # LOAD REMARKS MAP
    # =====================================================
    remarks_map = {}
    dsr_docname = frappe.db.get_value(
        "DSR Remark", {"date": selected_date}, "name"
    )

    if dsr_docname:
        dsr = frappe.get_doc("DSR Remark", dsr_docname)
        for row in dsr.dsr_employee_details:
            emp_no = frappe.db.get_value(
                "Employee", row.employee_id, "employee_number"
            )
            if emp_no:
                remarks_map[emp_no] = row.remark or ""

    # =====================================================
    # PRE-FETCH: branch names (bulk, keyed by sol_id)
    # =====================================================
    all_sol_ids = list({emp.sol_id for emp in employees if emp.sol_id})
    branch_rows = frappe.get_all(
        "Sahayog Branch",
        filters={"sol_id": ["in", all_sol_ids]},
        fields=["sol_id", "branch"],
    ) if all_sol_ids else []
    branch_map = {row.sol_id: row.branch for row in branch_rows}

    # PRE-FETCH: leads for all employees on selected_date (single query)
    all_user_ids = [emp.user_id for emp in employees if emp.user_id]
    if all_user_ids and all_sol_ids:
        lead_rows = frappe.db.sql(
            """
            SELECT lead_owner, sol_id, status
            FROM `tabLead`
            WHERE lead_owner IN ({user_placeholders})
              AND sol_id IN ({sol_placeholders})
              AND DATE(creation) = %s
            """.format(
                user_placeholders=",".join(["%s"] * len(all_user_ids)),
                sol_placeholders=",".join(["%s"] * len(all_sol_ids)),
            ),
            tuple(all_user_ids) + tuple(all_sol_ids) + (selected_date,),
            as_dict=True,
        )
    else:
        lead_rows = []

    # Group leads by (lead_owner, sol_id)
    leads_map = {}
    for row in lead_rows:
        key = (row.lead_owner, row.sol_id)
        leads_map.setdefault(key, []).append(row.status)

    # =====================================================
    # DATA BUILDING
    # =====================================================
    data = []

    for emp in employees:
        branch_name = branch_map.get(emp.sol_id) or "Not Mapped"

        # Accurate per-day leads (lookup from pre-fetched map)
        statuses = leads_map.get((emp.user_id, emp.sol_id), [])

        total = len(statuses)
        converted = statuses.count("Converted")
        followup = statuses.count("Follow Up")
        notint = statuses.count("Not Interested")

        # Rating + color
        if converted >= 1:
            rating = "Good"
            rating_color = "green"
        elif followup >= 4 and converted == 0:
            rating = "Average"
            rating_color = "orange"
        else:
            rating = "Bad"
            rating_color = "red"

        qualify = "Qualified" if total >= 10 else "Disqualified"
        qualify_color = "green" if qualify == "Qualified" else "red"

        existing_remark = remarks_map.get(emp.employee_number, "")

        # =========================================
        # BUTTON RENDERING
        # =========================================
        if not existing_remark:
            btn_label = "Add Remark"
            remark_cell = (
                f"<div style='text-align:center; display:flex; align-items:center; justify-content:center;'>"
                f"<button class='remark-btn' "
                f"data-emp='{emp.employee_number}' "
                f"style='background:rgb(59 130 246); color:#ffffff; border:none; "
                f"border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer; "
                f"transition:all 0.15s ease;'>"
                f"{btn_label}</button>"
                f"</div>"
            )
        else:
            btn_label = "View Remark"
            remark_cell = (
                f"<div style='text-align:center; display:flex; align-items:center; justify-content:center;'>"
                f"<button class='remark-btn' "
                f"data-emp='{emp.employee_number}' "
                f"style='background:rgb(22 163 74); color:#ffffff; border:none; "
                f"border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer; "
                f"transition:all 0.15s ease;'>"
                f"{btn_label}</button>"
                f"</div>"
            )

        data.append(
            {
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
                "dsr_rating_color": rating_color,
                "dsr_qualification": qualify,
                "dsr_qualification_color": qualify_color,
                "existing_remark": existing_remark,
                "remarks": remark_cell,
            }
        )

    # SORTING
    data.sort(key=lambda x: x["total_leads"], reverse=True)

    # =====================================================
    # COLUMNS
    # =====================================================
    columns = [
        {"label": "SOL ID", "fieldname": "sol_id", "fieldtype": "Data", "width": 90},
        {
            "label": "Remarks",
            "fieldname": "remarks",
            "fieldtype": "HTML",
            "width": 160,
            "height": 100,
        },
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 120},
        {
            "label": "Emp ID",
            "fieldname": "employee_number",
            "fieldtype": "Data",
            "width": 100,
        },
        {
            "label": "Employee Name",
            "fieldname": "employee_name",
            "fieldtype": "Data",
            "width": 150,
        },
        {
            "label": "Designation",
            "fieldname": "designation",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": "Total Leads",
            "fieldname": "total_leads",
            "fieldtype": "Int",
            "width": 90,
        },
        {
            "label": "Converted",
            "fieldname": "converted_leads",
            "fieldtype": "Int",
            "width": 90,
        },
        {
            "label": "Follow-up",
            "fieldname": "followup_leads",
            "fieldtype": "Int",
            "width": 90,
        },
        {
            "label": "Not Interested",
            "fieldname": "not_interested_leads",
            "fieldtype": "Int",
            "width": 130,
        },
        {
          "label": "DSR Rating",
          "fieldname": "dsr_rating",
          "fieldtype": "Data",
          "width": 90,
        },
        {
          "label": "DSR Qualification",
          "fieldname": "dsr_qualification",
          "fieldtype": "Data",
          "width": 130,
        },
        # hidden helper fields for color
        {
          "label": "Rating Color",
          "fieldname": "dsr_rating_color",
          "fieldtype": "Data",
          "hidden": 1,
        },
        {
          "label": "Qual Color",
          "fieldname": "dsr_qualification_color",
          "fieldtype": "Data",
          "hidden": 1,
        },
    ]

    return columns, data
