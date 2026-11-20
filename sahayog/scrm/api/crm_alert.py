import frappe
from frappe.utils import getdate, nowdate, add_days

# Normalized keywords/prefixes for target designations
TARGET_DESIGNATION_PATTERNS = [
    # Assistant Branch Manager
    "%asst%branch manager%",
    "%assistant branch manager%",
    "%abm%",
    # Branch Operation / Operations Manager
    "%branch operation%manager%",
    "%assi%operation manager%",
    "%bom%",
    # Branch Officer
    "%branch officer%",
    # Customer Service Officer
    "%customer service officer%",
    "%customer service executive%",
    "%cso%",
    # Block Development Officer
    "%block development officer%",
    "%bdo%",
    # Business Development Executive
    "%business development executive%",
    "%bde%",
    # Relationship Officer (all variants: DDS, Operations, SMBG, TASC, CASA)
    "%relationship officer%",
    # Account / Accounts Executive
    "%account%executive%",
]


def get_eligible_employees():
    """Fetch active employees belonging to target designations below Branch Manager."""
    like_conditions = " OR ".join([f"LOWER(designation) LIKE {frappe.db.escape(p)}" for p in TARGET_DESIGNATION_PATTERNS])

    # Strictly exclude Branch Managers and higher positions
    sql = f"""
        SELECT 
            name, employee_name, user_id, designation, 
            branch, sahayog_branch, reports_to, holiday_list
        FROM `tabEmployee`
        WHERE status = 'Active'
          AND ({like_conditions})
          AND LOWER(designation) NOT IN ('branch manager', 'branch manager jll', 'sr. branch manager')
          AND LOWER(designation) NOT LIKE '%%area manager%%'
          AND LOWER(designation) NOT LIKE '%%regional%%'
          AND LOWER(designation) NOT LIKE '%%zonal%%'
          AND LOWER(designation) NOT LIKE '%%cluster%%'
          AND LOWER(designation) NOT LIKE '%%head%%'
    """
    return frappe.db.sql(sql, as_dict=True)
