# Copyright (c) 2025, Developer Team and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class BDOPerformance(Document):
	pass


import frappe
from frappe import _

@frappe.whitelist()
def get_employee_kpi():
    user_email = frappe.session.user  # Or dynamically from user
    if user_email == "Guest":
        frappe.throw(_("You must be logged in to view this dashboard."))

    # Extract Emp ID from email
    emp_id = user_email.split("@")[0]  # "8446"


    # Step 1: Check if the employee record exists in BDO Performance
    result = frappe.db.sql("""
        SELECT name FROM `tabBDO Performance`
        WHERE empid = %s
    """, (emp_id,), as_dict=True)

    if not result:
        frappe.throw(_("No BDO Performance record found for this employee."))

    # Step 2: Fetch KPI data
    data = frappe.db.sql("""
        SELECT
         zone_name,
			region_name,
			district_name,
			branch_name,
			empid,
			name1,
			designation_name,
			join_dur,
			inactive,
			active,
			total_ssagnt,
			new_ssagnt,
			new_rd_ac,
			new_rd_amt,
			new_smbg_ac,
			new_smbg_amt,
			total_rdsmbg_ac,
			total_rdsmbg_amt,
			dam_ac,
			dam_amt,
			fd_ac,
			fd_atm,
			fd_6m_ac,
			fd_6m_amt,
			mis_ac,
			mis_amt,
			total_fd_ac,
			total_fd_amt,
			rddemand,
			rdcolle,
			smbg_demand,
			smbg_colle,
			total_rdsmbg_demand,
            modified,
			total_rdsmbg_collection                
        FROM `tabBDO Performance`
        WHERE empid = %s
        LIMIT 1
    """, (emp_id,), as_dict=True)[0]

    # Step 3: Calculate % Achieved
    demand = data.get("total_rdsmbg_demand") or 0
    collected = data.get("total_rdsmbg_collection") or 0
    data["percent_achieved"] = round((collected / demand) * 100) if demand else 0

    return data
