# apps/sahayog/sahayog/scrm/api/lead_owner_data.py
import frappe
import json
from frappe import _


@frappe.whitelist()
def get_all_employees():
    """
    Custom API to fetch all employees with complete field access
    Bypasses user permissions for CRM system usage
    Returns: List of employee dictionaries with all required fields
    """
    try:
        # Use frappe.get_all with ignore_permissions to bypass all user restrictions
        employees = frappe.get_all("Employee", 
            fields=[
                "name", "employee_name", "user_id", "designation", 
                "branch", "employee_number", "first_name", "last_name", 
                "custom_district", "department", "company", "reports_to",
                "date_of_joining", "gender", "status", "custom_zone", "custom_region"
            ],
            filters=[["status", "=", "Active"]],  # Only active employees
            ignore_permissions=True  # This bypasses all permission checks
        )
        
        # Log successful operation for debugging purposes
        frappe.log(f"CRM API: Successfully fetched {len(employees)} employees")
        return employees
        
    except Exception as e:
        # Log error and return empty list as fallback
        frappe.log_error(f"Error in get_all_employees CRM API: {str(e)}")
        return []


@frappe.whitelist()
def get_employee_mapping():
    """
    Custom API that returns processed employee mapping for CRM frontend
    Creates ready-to-use employee dictionary mapped by user_id
    Returns: Dictionary with user_id as key and employee details as value
    """
    try:
        # Fetch employee data with all required fields for CRM
        employees = frappe.get_all("Employee", 
            fields=[
                "name", "employee_name", "user_id", "designation", 
                "branch", "employee_number", "first_name", "last_name", 
                "custom_district", "department", "company", "custom_zone", "custom_region"
            ],
            filters=[["status", "=", "Active"]],
            ignore_permissions=True
        )
        
        # Process and create employee mapping dictionary for frontend consumption
        emp_map = {}
        processed_count = 0
        
        for emp in employees:
            # Only process employees that have user_id (linked to system users)
            if emp.user_id:
                # Build comprehensive employee name from available fields with fallback options
                emp_name = emp.employee_name or \
                          (emp.first_name and emp.last_name and f"{emp.first_name} {emp.last_name}") or \
                          emp.first_name or emp.user_id

                # Create comprehensive employee object for CRM frontend usage
                emp_map[emp.user_id] = {
                    "name": emp_name,
                    "id": emp.name,
                    "user_id": emp.user_id,
                    "employee_number": emp.employee_number or emp.name,
                    "designation": emp.designation or "-",
                    "branch": emp.branch or "-",
                    "district": emp.custom_district or "-",
                    "department": emp.department or "-",
                    "company": emp.company or "-",
                    "zone": emp.custom_zone or "-",
                    "region": emp.custom_region or "-"
                }
                processed_count += 1
        
        frappe.log(f"CRM API: Successfully mapped {processed_count} employees with user IDs")
        return emp_map
        
    except Exception as e:
        frappe.log_error(f"Error in get_employee_mapping CRM API: {str(e)}")
        return {}


@frappe.whitelist()
def get_employee_by_user_ids(user_ids):
    """
    Fetch specific employees by their user IDs for dynamic loading
    Used when new lead owners are encountered during pagination
    Args: user_ids - List of user IDs to fetch (JSON string or list)
    Returns: List of employee dictionaries matching the provided user IDs
    """
    try:
        if not user_ids:
            return []
            
        # Convert JSON string to list if needed
        if isinstance(user_ids, str):
            user_ids = frappe.parse_json(user_ids)
        
        # Validate input
        if not isinstance(user_ids, list):
            frappe.throw(_("user_ids must be a list"))
        
        # Fetch employees matching the provided user IDs
        employees = frappe.get_all("Employee", 
            fields=[
                "name", "employee_name", "user_id", "designation", 
                "branch", "employee_number", "first_name", "last_name", 
                "custom_district", "department", "custom_zone", "custom_region"
            ],
            filters=[
                ["user_id", "in", user_ids],
                ["status", "=", "Active"]
            ],
            ignore_permissions=True
        )
        
        frappe.log(f"CRM API: Successfully fetched {len(employees)} employees for user IDs: {user_ids}")
        return employees
        
    except Exception as e:
        frappe.log_error(f"Error in get_employee_by_user_ids CRM API: {str(e)}")
        return []


@frappe.whitelist()
def get_all_branches():
    """
    Custom API to fetch all branches with SOL ID mapping
    Bypasses user permissions for CRM system access to branch data
    Returns: List of branch dictionaries including sol_id field (SOL ID)
    """
    try:
        # Fetch all branch data including sol_id field for SOL ID mapping
        branches = frappe.get_all("Branch", 
            fields=["name", "sol_id", "branch_code", "company", "custom_district"],  # ✅ Updated: sol_id instead of solid
            ignore_permissions=True  # Bypass all permission restrictions
        )
        
        # Log successful operation for monitoring
        frappe.log(f"CRM API: Successfully fetched {len(branches)} branches")
        return branches
        
    except Exception as e:
        # Log error and return empty list to prevent frontend crashes
        frappe.log_error(f"Error in get_all_branches CRM API: {str(e)}")
        return []


@frappe.whitelist()
def get_branch_mapping():
    """
    Custom API that returns branch to SOL ID mapping for CRM frontend
    Creates ready-to-use branch dictionary for SOL ID lookups in tables
    Returns: Dictionary with branch name as key and SOL ID as value
    """
    try:
        # Fetch branch data with sol_id field (contains SOL ID)
        branches = frappe.get_all("Branch", 
            fields=["name", "sol_id"],  # ✅ Updated: sol_id instead of solid
            ignore_permissions=True
        )
        
        # Create branch name to SOL ID mapping dictionary
        branch_map = {}
        for branch in branches:
            if branch.name:
                # Map branch name to its corresponding SOL ID (sol_id field)
                branch_map[branch.name] = branch.sol_id or "-"  # ✅ Updated: sol_id instead of solid
        
        frappe.log(f"CRM API: Successfully mapped {len(branch_map)} branches to SOL IDs")
        return branch_map
        
    except Exception as e:
        frappe.log_error(f"Error in get_branch_mapping CRM API: {str(e)}")
        return {}


@frappe.whitelist()
def get_crm_master_data():
    """
    Combined API to fetch both employee and branch data in single optimized call
    Most efficient method for CRM system initialization - reduces API calls
    Returns: Dictionary containing both employee mapping and branch mapping with stats
    """
    try:
        # Fetch all active employee data
        employees = frappe.get_all("Employee", 
            fields=[
                "name", "employee_name", "user_id", "designation", 
                "branch", "employee_number", "first_name", "last_name", 
                "custom_district", "department", "custom_zone", "custom_region"
            ],
            filters=[["status", "=", "Active"]],
            ignore_permissions=True
        )
        
        # Fetch all branch data with SOL ID
        branches = frappe.get_all("Branch", 
            fields=["name", "sol_id"],  # ✅ Updated: sol_id instead of solid
            ignore_permissions=True
        )
        
        # Process employee mapping for frontend consumption
        emp_map = {}
        for emp in employees:
            if emp.user_id:
                # Build comprehensive employee name with fallbacks
                emp_name = emp.employee_name or \
                          (emp.first_name and emp.last_name and f"{emp.first_name} {emp.last_name}") or \
                          emp.first_name or emp.user_id

                emp_map[emp.user_id] = {
                    "name": emp_name,
                    "id": emp.name,
                    "user_id": emp.user_id,
                    "employee_number": emp.employee_number or emp.name,
                    "designation": emp.designation or "-",
                    "branch": emp.branch or "-",
                    "district": emp.custom_district or "-",
                    "zone": emp.custom_zone or "-",
                    "region": emp.custom_region or "-"
                }
        
        # Process branch to SOL ID mapping
        branch_map = {}
        for branch in branches:
            if branch.name:
                branch_map[branch.name] = branch.sol_id or "-"  # ✅ Updated: sol_id instead of solid
        
        # Combine all data into single comprehensive response object
        result = {
            "employees": emp_map,
            "branches": branch_map,
            "stats": {
                "total_employees": len(emp_map),
                "total_branches": len(branch_map),
                "total_raw_employees": len(employees)
            }
        }
        
        frappe.log(f"CRM API: Successfully fetched master data - {len(emp_map)} employees, {len(branch_map)} branches")
        return result
        
    except Exception as e:
        frappe.log_error(f"Error in get_crm_master_data API: {str(e)}")
        # Return empty structure on error to prevent frontend crashes
        return {
            "employees": {},
            "branches": {},
            "stats": {"total_employees": 0, "total_branches": 0, "total_raw_employees": 0}
        }


@frappe.whitelist()
def validate_crm_data_access():
    """
    Utility method to validate if current user can access CRM data
    Used for debugging permission issues
    Returns: Dictionary with access status and user information
    """
    try:
        current_user = frappe.session.user
        user_roles = frappe.get_roles(current_user)
        
        # Test access to Employee and Branch doctypes
        try:
            emp_count = frappe.db.count("Employee")
            emp_access = True
        except Exception:
            emp_count = 0
            emp_access = False
            
        try:
            branch_count = frappe.db.count("Branch") 
            branch_access = True
        except Exception:
            branch_count = 0
            branch_access = False
        
        result = {
            "user": current_user,
            "roles": user_roles,
            "employee_access": emp_access,
            "employee_count": emp_count,
            "branch_access": branch_access,
            "branch_count": branch_count,
            "is_administrator": "Administrator" in user_roles,
            "timestamp": frappe.utils.now_datetime()
        }
        
        frappe.log(f"CRM API: Data access validation for user {current_user}: {result}")
        return result
        
    except Exception as e:
        frappe.log_error(f"Error in validate_crm_data_access API: {str(e)}")
        return {
            "error": str(e),
            "user": frappe.session.user,
            "timestamp": frappe.utils.now_datetime()
        }


@frappe.whitelist()
def debug_branch_fields():
    """
    Debug method to check what fields are available in Branch DocType
    Returns: Sample branch data with all available fields
    """
    try:
        # Get a sample branch with all fields to see structure
        sample_branches = frappe.get_all("Branch", 
            fields=["*"],  # Get all available fields
            limit=3,
            ignore_permissions=True
        )
        
        available_fields = []
        if sample_branches:
            available_fields = list(sample_branches[0].keys())
        
        result = {
            "total_branches": len(sample_branches),
            "available_fields": available_fields,
            "sample_data": sample_branches
        }
        
        frappe.log(f"CRM API: Branch debug - Found {len(sample_branches)} branches with fields: {available_fields}")
        return result
        
    except Exception as e:
        frappe.log_error(f"Error in debug_branch_fields: {str(e)}")
        return {"error": str(e)}
