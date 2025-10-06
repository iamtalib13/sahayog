
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
        # Simplified query without complex CASE statements that might cause issues
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
        
        # Handle Employee and AUTH ID logic in Python instead of SQL
        for row in data:
            # Format creation date
            if row.get('creation'):
                try:
                    row['creation'] = frappe.utils.format_datetime(
                        row['creation'], 
                        format_string="dd-MM-yyyy hh:mm:ss"
                    )
                except:
                    pass
            
            # Handle Employee field - make blank if null, empty, or '0'
            employee_val = row.get('employee')
            if not employee_val or str(employee_val).strip() == '' or str(employee_val) == '0':
                row['employee'] = ''
                row['auth_id'] = ''
            else:
                # Generate AUTH ID for valid employee
                try:
                    emp_num = str(employee_val).strip()
                    row['auth_id'] = f"SAH{emp_num.zfill(5)}"
                except:
                    row['employee'] = ''
                    row['auth_id'] = ''
            
            # Handle other null fields
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