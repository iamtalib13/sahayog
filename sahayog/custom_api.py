import frappe
import json
from datetime import datetime

@frappe.whitelist()
def get_agent_report_data():
    """
    Optimized method to fetch Agent data with Employee and Sahayog Branch details
    using a single efficient query with joins
    """
    try:
        query = """
        SELECT 
            a.name as agent_id,
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

        for row in data:

            # Format creation datetime
            if row.get('creation'):
                try:
                    row['creation'] = frappe.utils.format_datetime(
                        row['creation'],
                        format_string="dd-MM-yyyy hh:mm:ss"
                    )
                except:
                    pass

            # Process employee & AUTH ID
            employee_val = row.get('employee')

            if not employee_val or str(employee_val).strip() in ['', '0']:
                row['employee'] = ''
                row['auth_id'] = ''
            else:
                try:
                    emp_num = str(employee_val).strip()
                    length = len(emp_num)

                    # --- Custom Padding Logic ---
                    if length == 1:
                        padded = "000" + emp_num
                    elif length == 2:
                        padded = "00" + emp_num
                    elif length == 3:
                        padded = "0" + emp_num
                    elif length in (4, 5):
                        padded = emp_num
                    else:
                        padded = emp_num  # fallback
                    # ----------------------------

                    row['auth_id'] = f"SAH0{padded}"

                except:
                    row['employee'] = ''
                    row['auth_id'] = ''

            # Replace null fields with blank
            for field in ['employee_name', 'branch', 'zone', 'region', 'district', 'sol_id']:
                if row.get(field) is None:
                    row[field] = ''

        return {
            'status': 'success',
            'data': data,
            'count': len(data)
        }

    except Exception as e:
        frappe.log_error(f"Agent Report Error: {str(e)}", "Agent Report Generation")
        frappe.local.response['http_status_code'] = 500
        return {
            'status': 'error',
            'message': 'Failed to generate report'
        }


@frappe.whitelist()
def ping():
    return "pong"
