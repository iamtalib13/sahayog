import frappe
from frappe import _
from frappe.utils import getdate, get_last_day
import json
from collections import defaultdict

@frappe.whitelist()
def get_dsr_master_report(month=None, branch=None):
    """
    Fast server-side DSR master report calculation
    Returns monthly aggregated data for all employees
    """
    
    try:
        if not month:
            month = frappe.utils.today()[:7]  # Current month YYYY-MM
        
        start_date = month + '-01'
        end_date = get_last_day(start_date).strftime('%Y-%m-%d')
        
        # Build conditions for employee filter
        employee_conditions = []
        employee_values = {}
        
        if branch:
            employee_conditions.append("e.branch = %(branch)s")
            employee_values['branch'] = branch
            
        employee_where = " AND " + " AND ".join(employee_conditions) if employee_conditions else ""
        
        # Step 1: Get all employees
        employee_query = """
            SELECT 
                e.name as employee_code,
                e.employee_name,
                e.user_id,
                COALESCE(e.branch, 'Not Set') as branch_name
            FROM 
                `tabEmployee` e
            WHERE 
                e.user_id IS NOT NULL
                {employee_where}
        """.format(employee_where=employee_where)
        
        employees = frappe.db.sql(employee_query, employee_values, as_dict=True)
        
        if not employees:
            return {
                'success': True,
                'data': [],
                'totals': {'qualified': 0, 'disqualified': 0, 'good_rating': 0, 'average_rating': 0, 'bad_rating': 0},
                'month': month
            }
        
        # Step 2: Get all leads for the month in one optimized query
        user_ids = [emp.user_id for emp in employees]
        
        leads_query = """
            SELECT 
                l.owner,
                DATE(l.creation) as lead_date,
                COUNT(*) as daily_leads,
                COUNT(CASE WHEN l.status = 'Converted' THEN 1 END) as daily_converted
            FROM 
                `tabLead` l
            WHERE 
                l.owner IN %(user_ids)s
                AND l.creation >= %(start_date)s 
                AND l.creation <= %(end_date)s
                AND l.docstatus = 0
            GROUP BY 
                l.owner, DATE(l.creation)
            HAVING 
                daily_leads > 0
        """
        
        leads_values = {
            'user_ids': user_ids,
            'start_date': start_date + ' 00:00:00',
            'end_date': end_date + ' 23:59:59'
        }
        
        daily_data = frappe.db.sql(leads_query, leads_values, as_dict=True)
        
        # Step 3: For follow-ups, get appointment counts (simplified approach)
        # We'll approximate follow-ups by checking if leads have future appointments
        try:
            followup_query = """
                SELECT 
                    l.owner,
                    DATE(l.creation) as lead_date,
                    COUNT(DISTINCT a.party) as leads_with_followups
                FROM 
                    `tabLead` l
                LEFT JOIN 
                    `tabAppointment` a ON l.name = a.party 
                    AND a.appointment_with = 'Lead'
                    AND a.status != 'Cancelled'
                WHERE 
                    l.owner IN %(user_ids)s
                    AND l.creation >= %(start_date)s 
                    AND l.creation <= %(end_date)s
                    AND l.docstatus = 0
                GROUP BY 
                    l.owner, DATE(l.creation)
            """
            
            followup_data = frappe.db.sql(followup_query, leads_values, as_dict=True)
            
            # Create followup lookup
            followup_map = {}
            for row in followup_data:
                key = f"{row.owner}_{row.lead_date}"
                followup_map[key] = row.leads_with_followups or 0
                
        except Exception as e:
            # If appointment table doesn't exist or has issues, use fallback
            frappe.log_error(f"Appointment query failed: {str(e)}")
            followup_map = {}
        
        # Step 4: Process results to get monthly counts per employee
        employee_summary = {}
        employee_map = {emp.user_id: emp for emp in employees}
        
        totals = {
            'qualified': 0,
            'disqualified': 0, 
            'good_rating': 0,
            'average_rating': 0,
            'bad_rating': 0
        }
        
        for row in daily_data:
            user_id = row.owner
            lead_date = str(row.lead_date)
            
            if user_id not in employee_map:
                continue
                
            emp = employee_map[user_id]
            emp_key = emp.employee_code
            
            if emp_key not in employee_summary:
                employee_summary[emp_key] = {
                    'branch_name': emp.branch_name,
                    'employee_name': emp.employee_name or user_id,
                    'employee_code': emp.employee_code,
                    'qualified_days': 0,
                    'disqualified_days': 0,
                    'good_days': 0,
                    'average_days': 0,
                    'bad_days': 0
                }
            
            # Apply your exact logic for this day
            daily_leads = row.daily_leads or 0
            daily_converted = row.daily_converted or 0
            
            # Get follow-ups for this day (with fallback)
            followup_key = f"{user_id}_{lead_date}"
            daily_followups = followup_map.get(followup_key, 0)
            
            # Qualification logic: >= 10 leads = Qualified
            if daily_leads >= 10:
                employee_summary[emp_key]['qualified_days'] += 1
                totals['qualified'] += 1
            else:
                employee_summary[emp_key]['disqualified_days'] += 1
                totals['disqualified'] += 1
            
            # Rating logic: >= 1 converted = Good, >= 4 followups = Average, else = Bad
            if daily_converted >= 1:
                employee_summary[emp_key]['good_days'] += 1
                totals['good_rating'] += 1
            elif daily_followups >= 4:
                employee_summary[emp_key]['average_days'] += 1
                totals['average_rating'] += 1
            else:
                employee_summary[emp_key]['bad_days'] += 1
                totals['bad_rating'] += 1
        
        # Convert to list format
        results = list(employee_summary.values())
        
        return {
            'success': True,
            'data': results,
            'totals': totals,
            'month': month,
            'total_employees': len(results)
        }
        
    except Exception as e:
        frappe.log_error(f"DSR Master Report Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'data': [],
            'totals': {'qualified': 0, 'disqualified': 0, 'good_rating': 0, 'average_rating': 0, 'bad_rating': 0}
        }
