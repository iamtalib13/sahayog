import frappe
from frappe import _, cint
from frappe.utils import getdate, date_diff


@frappe.whitelist()
def get_next_support_staff_id():
    """Predict the next available 'P' series ID by checking existing employees."""
    # Find the maximum number used in P-series from employee_number field
    # We look for both 'P.00001' and 'P1' patterns
    query = """
        SELECT employee_number 
        FROM `tabEmployee` 
        WHERE employee_number LIKE 'P%' 
        ORDER BY LENGTH(employee_number) DESC, employee_number DESC 
        LIMIT 50
    """
    existing_p_numbers = frappe.db.sql(query, as_dict=True)
    
    max_num = 0
    for row in existing_p_numbers:
        emp_num = row.get("employee_number")
        if not emp_num: continue
        
        # Strip 'P.' or 'P' and try to get the number
        num_str = ""
        if emp_num.startswith("P."):
            num_str = emp_num[2:]
        elif emp_num.startswith("P"):
            num_str = emp_num[1:]
            
        try:
            val = cint(num_str)
            if val > max_num:
                max_num = val
        except:
            continue
            
    # Also check tabSeries for P. as a fallback/safety
    series_val = frappe.db.sql("SELECT current FROM `tabSeries` WHERE name='P.'")
    series_current = series_val[0][0] if series_val else 0
    
    if cint(series_current) > max_num:
        max_num = cint(series_current)

    next_id = max_num + 1
    return f"P{next_id}"


def _parse_date(val):
    """Convert dd-mm-yyyy or dd/mm/yyyy to yyyy-mm-dd for MySQL."""
    if not val:
        return None
    val = str(val).strip()
    # Already in correct format
    if len(val) == 10 and val[4] in ('-', '/') and val[7] in ('-', '/'):
        return val.replace('/', '-')
    # dd-mm-yyyy or dd/mm/yyyy
    for sep in ('-', '/'):
        parts = val.split(sep)
        if len(parts) == 3 and len(parts[2]) == 4:
            return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    return val


@frappe.whitelist()
def create_support_staff(data):
    """
    Create a new Employee (Support Staff) from the portal.
    Only HR and Admins are allowed.
    """
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized to create employees"), frappe.PermissionError)

    if isinstance(data, str):
        import json
        data = json.loads(data)

    # Validations
    if data.get("employee_number") and frappe.db.exists("Employee", {"employee_number": data.get("employee_number")}):
        frappe.throw(_("Employee Code {0} already exists").format(data.get("employee_number")))

    if data.get("pan_number") and frappe.db.exists("Employee", {"custom_pan_number": data.get("pan_number")}):
        frappe.throw(_("PAN Number {0} is already registered with another employee").format(data.get("pan_number")))

    if data.get("aadhaar_card_number") and frappe.db.exists("Employee", {"custom_aadhar_number": data.get("aadhaar_card_number")}):
        frappe.throw(_("Aadhaar Number is already registered with another employee"))
    
    # Date Validations
    doj = getdate(data.get("date_of_joining")) if data.get("date_of_joining") else None
    doc = getdate(data.get("final_confirmation_date")) if data.get("final_confirmation_date") else None
    if doj and doc and date_diff(doc, doj) < 0:
        frappe.throw(_("Date of Confirmation cannot be earlier than Date of Joining"))

    # Reporting Manager Validation
    if data.get("reports_to") and not frappe.db.exists("Employee", data.get("reports_to")):
        frappe.throw(_("Reporting Manager {0} does not exist").format(data.get("reports_to")))

    # Prepare Employee Doc
    # Map incoming data to standard Frappe/HRMS fields
    new_emp = frappe.get_doc({
        "doctype": "Employee",
        "employee_number": data.get("employee_number"),
        "first_name": data.get("first_name"),
        "middle_name": data.get("middle_name"),
        "last_name": data.get("last_name"),
        "gender": data.get("gender"),
        "date_of_birth": _parse_date(data.get("date_of_birth")),
        "date_of_joining": _parse_date(data.get("date_of_joining")),
        "final_confirmation_date": _parse_date(data.get("final_confirmation_date")),
        "status": "Active",
        "company": data.get("company") or frappe.defaults.get_global_default("company"),
        "department": data.get("department"),
        "designation": data.get("designation"),
        "branch": data.get("branch"),
        "sahayog_branch": data.get("sol_id"),
        "sol_id": data.get("sol_id"),
        "reports_to": data.get("reports_to"),
        "cell_number": data.get("mobile_number"),
        "personal_email": data.get("personal_email"),
        "bank_name": data.get("bank_name"),
        "bank_ac_no": data.get("bank_account_number"),
        "marital_status": data.get("marital_status"),
        "blood_group": data.get("blood_group"),
        "permanent_address": data.get("permanent_address"),
        "current_address": data.get("current_address"),
        "relieving_date": data.get("relieving_date"),
        "resignation_letter_date": data.get("resignation_letter_date"),
        "default_shift": data.get("shift"),
        "employment_type": data.get("employment_type"),
        
        # Custom Fields
        "custom_is_support_staff": 1,
        "custom_medical_deduction": 100,
        "custom_pan_number": data.get("pan_number"),
        "custom_aadhar_number": data.get("aadhaar_card_number"),
    })

    new_emp.insert(ignore_permissions=True, ignore_links=True, ignore_mandatory=True)

    # Set optional custom fields via raw SQL to bypass meta validation
    col_map = {
        "ctc": data.get("monthly_gross_salary"),
    }
    # Auto-fetch zone/region/district from Sahayog Branch if sol_id provided
    if data.get("sol_id") and frappe.db.exists("Sahayog Branch", data.get("sol_id")):
        branch_doc = frappe.db.get_value("Sahayog Branch", data.get("sol_id"),
            ["zone", "region", "district"], as_dict=True)
        col_map["custom_zone"] = branch_doc.get("zone")
        col_map["custom_region"] = branch_doc.get("region")
        col_map["custom_district"] = branch_doc.get("district")
    else:
        col_map["custom_zone"] = data.get("zone")
        col_map["custom_region"] = data.get("region")
        col_map["custom_district"] = data.get("district_name")

    existing_cols = [r[0] for r in frappe.db.sql("SHOW COLUMNS FROM `tabEmployee`")]
    for col, val in col_map.items():
        if val and col in existing_cols:
            frappe.db.sql(f"UPDATE `tabEmployee` SET `{col}`=%s WHERE name=%s", (val, new_emp.name))
    
    return {
        "success": True,
        "message": _("Employee {0} created successfully").format(new_emp.name),
        "employee": new_emp.name
    }

@frappe.whitelist()
def bulk_import_employees(rows):
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    if isinstance(rows, str):
        import json
        rows = json.loads(rows)

    results = {"created": 0, "failed": 0, "errors": []}

    for i, row in enumerate(rows, start=2):  # start=2 because row 1 is header
        try:
            # Reuse existing create logic
            create_support_staff(row)
            results["created"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({"row": i, "name": row.get("first_name", "") + " " + row.get("last_name", ""), "error": str(e)})

    return results


@frappe.whitelist()
def process_employee_exit(employee, resignation_letter_date, relieving_date, reason_for_leaving):
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    if not frappe.db.exists("Employee", employee):
        frappe.throw(_("Employee {0} not found").format(employee))

    dor = getdate(resignation_letter_date)
    dreliev = getdate(relieving_date)
    doj = getdate(frappe.db.get_value("Employee", employee, "date_of_joining"))

    if doj and dor < doj:
        frappe.throw(_("Resignation date cannot be before Date of Joining"))
    if dreliev < dor:
        frappe.throw(_("Relieving date cannot be before Resignation date"))

    frappe.db.set_value("Employee", employee, {
        "resignation_letter_date": dor,
        "relieving_date": dreliev,
        "reason_for_leaving": reason_for_leaving,
        "status": "Left"
    })

    return {"success": True, "message": _("Employee {0} has been marked as exited").format(employee)}


@frappe.whitelist()
def update_employee_profile(employee, data):
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    if isinstance(data, str):
        import json
        data = json.loads(data)

    allowed_fields = [
        "cell_number", "personal_email", "permanent_address",
        "designation", "department", "branch", "reports_to",
        "bank_name", "bank_ac_no", "blood_group", "marital_status",
        "employment_type", "custom_pan_number", "custom_aadhar_number",
    ]
    # salary only for HR Manager / Admin
    if any(r in roles for r in ["HR Manager", "Administrator"]):
        allowed_fields.append("ctc")

    update = {k: data[k] for k in allowed_fields if k in data}
    if not update:
        frappe.throw(_("No valid fields to update"))

    frappe.db.set_value("Employee", employee, update)
    return {"success": True, "message": _("Employee {0} updated successfully").format(employee)}


@frappe.whitelist()
def get_employee_profile(employee):
    roles = frappe.get_roles(frappe.session.user)
    if not any(r in roles for r in ["HR Manager", "HR User", "Administrator"]):
        frappe.throw(_("Not authorized"), frappe.PermissionError)

    e = frappe.db.get_value("Employee", employee, [
        "name", "employee_name", "gender", "date_of_birth", "date_of_joining",
        "final_confirmation_date", "status", "relieving_date", "resignation_letter_date",
        "designation", "department", "employment_type", "branch", "sahayog_branch",
        "custom_zone", "custom_region", "custom_district",
        "cell_number", "personal_email", "permanent_address",
        "custom_pan_number", "custom_aadhar_number",
        "bank_name", "bank_ac_no", "reports_to",
        "marital_status", "blood_group", "ctc"
    ], as_dict=True)

    if not e:
        frappe.throw(_("Employee not found"))

    # fetch reporting manager name
    if e.get("reports_to"):
        e["reports_to_name"] = frappe.db.get_value("Employee", e.reports_to, "employee_name") or e.reports_to

    # hide salary from HR User (only HR Manager sees it)
    if "HR Manager" not in roles and "Administrator" not in roles:
        e["ctc"] = None

    return e


@frappe.whitelist()
def get_active_support_staff():
    return frappe.get_all(
        "Employee",
        filters={"custom_is_support_staff": 1, "status": "Active"},
        fields=["name", "employee_name", "designation", "branch"],
        order_by="employee_name"
    )


@frappe.whitelist()
def get_designations():
    return frappe.get_all("Designation", fields=["name"], order_by="name")

@frappe.whitelist()
def get_departments():
    return frappe.get_all("Department", fields=["name"], order_by="name")

@frappe.whitelist()
def get_divisions():
    return frappe.get_all("Division", fields=["name"], order_by="name")

@frappe.whitelist()
def get_shifts():
    return frappe.get_all("Shift Type", fields=["name"], order_by="name")

@frappe.whitelist()
def get_sahayog_branches():
    return frappe.get_all("Sahayog Branch", fields=["name"], order_by="name")

@frappe.whitelist()
def get_employment_types():
    return frappe.get_all("Employment Type", fields=["name"], order_by="name")

@frappe.whitelist()
def get_all_sol_ids():
    return frappe.get_all("Sahayog Branch", fields=["sol_id"], order_by="sol_id", filters={"sol_id": ["is", "set"]})

@frappe.whitelist()
def get_branch_details(branch):
    if not branch: return {}
    return frappe.db.get_value("Sahayog Branch", branch, ["zone", "region", "district", "state", "sol_id"], as_dict=True)

@frappe.whitelist()
def get_branch_details_by_sol_id(sol_id):
    if not sol_id: return {}
    # Since SOL ID is the name of the 'Sahayog Branch' document:
    branch_doc = frappe.get_doc("Sahayog Branch", sol_id)
    return {
        "branch": branch_doc.branch,
        "zone": branch_doc.zone,
        "region": branch_doc.region,
        "district": branch_doc.district,
        "state": branch_doc.state
    }

@frappe.whitelist()
def get_employees_for_reporting():
    return frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=["name", "employee_name", "designation"],
        order_by="employee_name"
    )


@frappe.whitelist()
def get_logged_in_employee():
    if frappe.session.user == "Administrator":
        return {
            "employee_name": "ADMIN",
            "employee": "ADMIN",
            "reports_to": "ADMIN",
            "designation": "ADMIN",
            "branch": "ADMIN",
            "custom_zone": "ADMIN",
            "custom_region": "ADMIN",
            "custom_division": "ADMIN",
            "date_of_joining": "ADMIN",
            "cell_number": "ADMIN",
            "gender": "ADMIN"
        }

    employee = frappe.get_value(
        "Employee",
        {"user_id": frappe.session.user},
        [
            "employee_name",
            "employee",  # employee code
            "reports_to",
            "designation",
            "branch",
            "custom_zone",
            "custom_region",
            "custom_division",
            "date_of_joining",
            "cell_number",
            "gender"
        ],
        as_dict=True
    )

    if not employee:
        return {}

    # If reports_to is set (it should be an employee ID), fetch its employee_name
    if employee.get("reports_to"):
        reports_to_name = frappe.get_value(
            "Employee",
            employee["reports_to"],
            "employee_name"
        )
        employee["reports_to"] = reports_to_name or employee["reports_to"]

    return employee


@frappe.whitelist()
def get_user_tickets():
    tickets = frappe.get_all(
        "Sahayog Ticket",
        filters={"owner": frappe.session.user},
        fields=["name", "status", "priority", "creation","branch_name","employee_name","region","call_log_date","ticket_type","description"],
        order_by="creation desc"
    )
    return tickets
