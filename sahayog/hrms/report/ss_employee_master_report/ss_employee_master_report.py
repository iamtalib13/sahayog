import frappe


def execute(filters=None):
    filters = filters or {}

    columns = [
        {"label": "Employee Code",       "fieldname": "employee_number",        "fieldtype": "Data", "width": 120},
        {"label": "Employee Name",        "fieldname": "employee_name",          "fieldtype": "Data", "width": 180},
        {"label": "Gender",               "fieldname": "gender",                 "fieldtype": "Data", "width": 80},
        {"label": "Date of Birth",        "fieldname": "date_of_birth",          "fieldtype": "Date", "width": 110},
        {"label": "Date of Joining",      "fieldname": "date_of_joining",        "fieldtype": "Date", "width": 110},
        {"label": "Date of Confirmation", "fieldname": "final_confirmation_date","fieldtype": "Date", "width": 130},
        {"label": "Department",           "fieldname": "department",             "fieldtype": "Data", "width": 140},
        {"label": "Designation",          "fieldname": "designation",            "fieldtype": "Data", "width": 140},
        {"label": "Grade",                "fieldname": "grade",                  "fieldtype": "Data", "width": 100},
        {"label": "CXO Level",            "fieldname": "cxo_level",              "fieldtype": "Data", "width": 100},
        {"label": "Employment Type",      "fieldname": "employment_type",        "fieldtype": "Data", "width": 130},
        {"label": "Business Unit",        "fieldname": "custom_division",        "fieldtype": "Data", "width": 130},
        {"label": "Cluster",              "fieldname": "custom_cluter",          "fieldtype": "Data", "width": 110},
        {"label": "State",                "fieldname": "state",                  "fieldtype": "Data", "width": 110},
        {"label": "Zone",                 "fieldname": "custom_zone",            "fieldtype": "Data", "width": 100},
        {"label": "Region",               "fieldname": "custom_region",          "fieldtype": "Data", "width": 100},
        {"label": "District",             "fieldname": "custom_district",        "fieldtype": "Data", "width": 120},
        {"label": "Branch",               "fieldname": "branch",                 "fieldtype": "Data", "width": 150},
        {"label": "Branch Code",          "fieldname": "sahayog_branch",         "fieldtype": "Data", "width": 110},
        {"label": "SOL ID",               "fieldname": "sol_id",                 "fieldtype": "Data", "width": 90},
        {"label": "Mobile",               "fieldname": "cell_number",            "fieldtype": "Data", "width": 110},
        {"label": "PAN Number",           "fieldname": "custom_pan_number",      "fieldtype": "Data", "width": 120},
        {"label": "Aadhaar Number",       "fieldname": "custom_aadhar_number",   "fieldtype": "Data", "width": 130},
        {"label": "UHID Number",          "fieldname": "custom_uhid_number",     "fieldtype": "Data", "width": 130},
        {"label": "Bank Name",            "fieldname": "bank_name",              "fieldtype": "Data", "width": 130},
        {"label": "Bank Account No",      "fieldname": "bank_ac_no",             "fieldtype": "Data", "width": 140},
        {"label": "Reporting Manager",    "fieldname": "reports_to",             "fieldtype": "Data", "width": 140},
        {"label": "Status",               "fieldname": "status",                 "fieldtype": "Data", "width": 80},
        {"label": "Relieving Date",       "fieldname": "relieving_date",         "fieldtype": "Date", "width": 110},
    ]

    conditions = "WHERE e.custom_is_support_staff = 1"

    # Status filter
    if filters.get("status"):
        conditions += " AND e.status = %(status)s"

    # Branch filter
    if filters.get("branch"):
        conditions += " AND e.branch = %(branch)s"

    # Department filter
    if filters.get("department"):
        conditions += " AND e.department = %(department)s"

    # Designation filter
    if filters.get("designation"):
        conditions += " AND e.designation = %(designation)s"

    # Employment Type filter
    if filters.get("employment_type"):
        conditions += " AND e.employment_type = %(employment_type)s"

    # Zone filter
    if filters.get("zone"):
        conditions += " AND e.custom_zone = %(zone)s"

    # Region filter
    if filters.get("region"):
        conditions += " AND e.custom_region = %(region)s"

    # Date of Joining filters
    if filters.get("from_date_of_joining"):
        conditions += " AND e.date_of_joining >= %(from_date_of_joining)s"

    if filters.get("to_date_of_joining"):
        conditions += " AND e.date_of_joining <= %(to_date_of_joining)s"

    # Relieving Date filters (for Left/Resigned employees)
    if filters.get("from_relieving_date"):
        conditions += " AND e.relieving_date >= %(from_relieving_date)s"

    if filters.get("to_relieving_date"):
        conditions += " AND e.relieving_date <= %(to_relieving_date)s"

    _emp_cols = {r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`")}
    _pan_col    = "custom_pan_number"    if "custom_pan_number"    in _emp_cols else "pan_number"    if "pan_number"    in _emp_cols else None
    _aadhaar_col = "custom_aadhar_number" if "custom_aadhar_number" in _emp_cols else "aadhar_number" if "aadhar_number" in _emp_cols else None
    _uhid_col   = "custom_uhid_number"   if "custom_uhid_number"   in _emp_cols else "uhid_number"   if "uhid_number"   in _emp_cols else None

    _pan_select     = f"e.{_pan_col} as custom_pan_number"       if _pan_col     else "NULL as custom_pan_number"
    _aadhaar_select = f"e.{_aadhaar_col} as custom_aadhar_number" if _aadhaar_col else "NULL as custom_aadhar_number"
    _uhid_select    = f"e.{_uhid_col} as custom_uhid_number"      if _uhid_col    else "NULL as custom_uhid_number"

    data = frappe.db.sql(f"""
        SELECT
            e.employee_number, e.employee_name, e.gender, e.date_of_birth, e.date_of_joining,
            e.final_confirmation_date, e.department, e.designation, e.grade, e.cxo_level,
            e.employment_type, e.custom_division, e.custom_cluter,
            sb.state,
            e.custom_zone, e.custom_region, e.custom_district,
            e.branch, e.sahayog_branch, e.sol_id,
            e.cell_number, {_pan_select}, {_aadhaar_select}, {_uhid_select},
            e.bank_name, e.bank_ac_no, e.reports_to, e.status, e.relieving_date
        FROM `tabEmployee` e
        LEFT JOIN `tabSahayog Branch` sb ON sb.name = e.sahayog_branch
        {conditions}
        ORDER BY CAST(REGEXP_REPLACE(IFNULL(e.employee_number, e.name), '[^0-9]', '') AS UNSIGNED),
                 IFNULL(e.employee_number, e.name)
    """, filters, as_dict=1)

    return columns, data
