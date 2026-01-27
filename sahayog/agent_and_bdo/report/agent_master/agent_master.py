# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

# Copyright (c) 2025, Developer Team
# For license information, please see license.txt

import frappe


def execute(filters=None):
    columns = [
        {"label": "Agent ID", "fieldname": "agent_id", "fieldtype": "Link", "options": "Agent", "width": 120},
        {"label": "Agent Code", "fieldname": "agent_code", "fieldtype": "Data", "width": 120},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 80},
        {"label": "SOL ID", "fieldname": "sol_id", "fieldtype": "Data", "width": 100},
        {"label": "Agent Name", "fieldname": "agent_name", "fieldtype": "Data", "width": 180},
        {"label": "Agent Status", "fieldname": "agent_status", "fieldtype": "Data", "width": 100},
        {"label": "Branch Code", "fieldname": "branch_code", "fieldtype": "Data", "width": 100},
        {"label": "Branch Name", "fieldname": "branch_name", "fieldtype": "Data", "width": 160},
        {"label": "Role", "fieldname": "role", "fieldtype": "Data", "width": 100},  
        {"label": "Employee", "fieldname": "employee", "fieldtype": "Data", "width": 120},
        {"label": "Auth ID", "fieldname": "auth_id", "fieldtype": "Data", "width": 120},
        {"label": "Creation", "fieldname": "creation", "fieldtype": "Datetime", "width": 150},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 160},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Data", "width": 120},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Data", "width": 120},
        {"label": "Region", "fieldname": "region", "fieldtype": "Data", "width": 120},
        {"label": "District", "fieldname": "district", "fieldtype": "Data", "width": 120},
    ]

    query = """
        SELECT 
            a.name AS agent_id,
            a.status,
            sb.sol_id,
            a.agent_name,
            a.agent_status,
            a.branch_code,
            a.branch_name,
            a.role,
            a.employee,
            a.creation,
            e.employee_name,
            sb.branch,
            sb.zone,
            sb.region,
            sb.district
        FROM `tabAgent` a
        LEFT JOIN `tabEmployee` e ON a.employee = e.name
        LEFT JOIN `tabSahayog Branch` sb ON a.branch_code = sb.sol_id
        ORDER BY a.creation DESC
    """

    data = frappe.db.sql(query, as_dict=True)

    # ---------------------------------
    # AUTH ID GENERATION LOGIC
    # ---------------------------------
    for row in data:
        employee = row.get("employee")
        agent_id = row.get("agent_id")

        if agent_id:
            # Extract numeric part from agent_id
            row["agent_code"] = "".join(filter(str.isdigit, agent_id))
        else:
            row["agent_code"] = ""


        if not employee or str(employee).strip() in ("", "0"):
            row["auth_id"] = ""
        else:
            emp_num = str(employee).strip()
            length = len(emp_num)

            if length == 1:
                padded = "000" + emp_num
            elif length == 2:
                padded = "00" + emp_num
            elif length == 3:
                padded = "0" + emp_num
            else:
                padded = emp_num

            row["auth_id"] = f"SAH0{padded}"

        # Replace NULL values with blank
        for field in ["employee_name", "branch", "zone", "region", "district", "sol_id"]:
            if row.get(field) is None:
                row[field] = ""

    return columns, data
