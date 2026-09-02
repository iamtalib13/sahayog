import frappe
from frappe import _
import re

# Function to update employee details in the Lead document
def update_employee_details(doc, method):
    if frappe.session.user != "Administrator":
        try:
            # Fetch employee_number, employee_name, designation, and location fields using get_value
            result = frappe.db.get_value(
                "Employee",
                {"user_id": frappe.session.user},
                ["employee_number", "employee_name", "designation", "branch", "custom_region", "custom_zone", "sol_id", "custom_district"],
            )

            if not result:
                frappe.throw("Could not fetch employee details. Please ensure your employee profile is properly set.")

            employee_number, employee_name, designation, branch, region, zone, sol_id, district = result

            # Set employee detail fields
            doc.custom_employee_id = employee_number
            doc.custom_employee_name = employee_name
            doc.custom_designation = designation

            # Conditionally set other fields if values are available
            if branch:
                doc.custom_branch = branch
            if region:
                doc.custom_region = region
            if zone:
                doc.custom_zone = zone
            if sol_id:
                doc.sol_id = sol_id
            if district:
                doc.custom_district = district

        except Exception:
            frappe.log_error(frappe.get_traceback(), "Lead Update Employee Details Error")
            frappe.throw("An error occurred while updating employee details.")


def validate_duplicate_lead(doc, method=None):
    """Server-side duplicate lead check — same mobile + product (amount ignored, no time limit).
    Runs in before_naming to prevent tabSeries locking when rejected, and guards against double-execution in validate.
    """
    if getattr(doc.flags, "duplicate_lead_checked", False):
        return

    if not doc.mobile_no or not doc.get("custom_product_table"):
        return

    product_list = [
        row.product
        for row in doc.custom_product_table
        if row.product
    ]

    if not product_list:
        return

    conditions = " OR ".join(
        ["lp.product = %s"] * len(product_list)
    )
    params = [doc.mobile_no, doc.name or ""]
    params.extend(product_list)

    duplicates = frappe.db.sql(
        f"""
        SELECT l.name, lp.product, lp.product_amount FROM `tabLead` l
        JOIN `tabLead Product` lp ON lp.parent = l.name
        WHERE l.mobile_no = %s
        AND l.name != %s
        AND ({conditions})
        LIMIT 1
        """,
        tuple(params),
        as_dict=True,
    )

    if duplicates:
        d = duplicates[0]
        frappe.throw(
            title="Duplicate Lead",
            msg=f"A lead for Product <b>{d.product}</b> already exists for this mobile number. (Lead: {d.name})"
        )

    doc.flags.duplicate_lead_checked = True


def validate_duplicate_appointment(doc, method):
    """Server-side duplicate appointment check — same party + scheduled_time.
    Works for both create and update. Runs on Appointment validate hook."""
    if not doc.party or not doc.scheduled_time:
        return

    filters = {
        "party": doc.party,
        "scheduled_time": doc.scheduled_time,
        "status": ["!=", "Cancelled"],
    }

    # Skip self when updating
    if doc.name:
        filters["name"] = ["!=", doc.name]

    exists = frappe.db.exists("Appointment", filters)

    if exists:
        frappe.throw(
            title="Duplicate Appointment",
            msg=f"An appointment already exists for this Lead at <b>{doc.scheduled_time}</b>. (Appointment: {exists})"
        )


def validate_appointment_fields(doc, method):
    """Validate Appointment required fields — party and scheduled_time."""
    if not doc.party:
        frappe.throw(
            title="Missing Lead",
            msg="Please select a Lead for this appointment."
        )
    if not doc.scheduled_time:
        frappe.throw(
            title="Missing Date & Time",
            msg="Please select a scheduled date and time."
        )


def validate_appointment_party(doc, method):
    """Validate Appointment party (Lead) exists."""
    if doc.party and not frappe.db.exists("Lead", doc.party):
        frappe.throw(
            title="Invalid Lead",
            msg=f"Lead <b>{doc.party}</b> does not exist."
        )


def validate_appointment_time(doc, method):
    """Validate Appointment scheduled time is not in the past."""
    from frappe.utils import now_datetime, get_datetime
    if doc.scheduled_time:
        scheduled = get_datetime(doc.scheduled_time)
        if scheduled < now_datetime():
            frappe.throw(
                title="Invalid Date & Time",
                msg="Scheduled time cannot be in the past."
            )


def validate_required_employee_fields(doc, method):
    """Validate that all required employee fields are set before allowing Lead creation"""
    if frappe.session.user != "Administrator":
        try:
            employee_doc = frappe.get_doc("Employee", {"user_id": frappe.session.user})
            
            # Check for required fields
            if not employee_doc.get("sol_id"):
                frappe.throw(
                    title="Missing Required Field",
                    msg="SOL ID is required in your employee profile. Please contact your administrator to set the SOL ID before creating leads."
                )
                
        except frappe.DoesNotExistError:
            frappe.throw("Could not find employee record for current user.")
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Lead Validation Error")
            frappe.throw("An error occurred while validating employee details.")


def validate_lead_mobile(doc, method):
    """Validate Lead mobile number format — 10 digits, starts with 6-9."""
    if doc.mobile_no:
        mobile = str(doc.mobile_no).strip()
        if not re.match(r'^[6-9]\d{9}$', mobile):
            frappe.throw(
                title="Invalid Mobile Number",
                msg="Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9."
            )


def validate_lead_products(doc, method):
    """Validate Lead product table — at least 1 product, all products have amount > 0."""
    if not doc.get("custom_product_table") or len(doc.custom_product_table) == 0:
        frappe.throw(
            title="Missing Products",
            msg="At least one product is required. Please add a product before saving."
        )

    for i, row in enumerate(doc.custom_product_table, 1):
        if not row.product:
            frappe.throw(
                title="Missing Product",
                msg=f"Row {i}: Product is required."
            )
        if not row.product_amount or row.product_amount <= 0:
            frappe.throw(
                title="Invalid Amount",
                msg=f"Row {i}: Product amount must be greater than 0."
            )


def validate_lead_source(doc, method):
    """Validate Lead source is set."""
    if not doc.source:
        frappe.throw(
            title="Missing Source",
            msg="Lead Source is required."
        )



# Function to set the 'Is Operation Lead' field before saving the document
def set_is_operation_lead(doc, method):
    user = frappe.session.user

    # Skip Administrator
    if user == "Administrator":
        return

    roles = frappe.get_roles(user)

    # If user has the role "Operations Support Executive", set flag
    if "Operations Support Executive" in roles:
        doc.custom_is_operation_lead = 1
    else:
        doc.custom_is_operation_lead = 0

# Assign employee to lead and replace lead owner details with assign employee info
@frappe.whitelist()
def assign_employee_to_lead(lead_name, user):
    """
    Assigns a user to a lead and sets custom fields based on Employee doctype.
    Also updates lead_owner with the employee's user_id.
    """
    if not lead_name or not user:
        frappe.throw(frappe._("Lead name and user are required"))

    # Fetch Employee linked to this user
    employee = frappe.get_all(
        "Employee",
        filters={"user_id": user},
        fields=["name", "employee_name", "designation", "custom_zone", "custom_region", "branch", "user_id", "custom_district"],
        limit=1,
    )

    if not employee:
        frappe.throw(frappe._("No Employee found for this user"))

    emp = employee[0]

    # Update the Lead fields
    frappe.db.set_value("Lead", lead_name, "custom_employee_id", emp["name"])
    frappe.db.set_value("Lead", lead_name, "custom_employee_name", emp["employee_name"])
    frappe.db.set_value("Lead", lead_name, "custom_designation", emp["designation"])
    frappe.db.set_value("Lead", lead_name, "custom_zone", emp["custom_zone"])
    frappe.db.set_value("Lead", lead_name, "custom_region", emp["custom_region"])
    frappe.db.set_value("Lead", lead_name, "custom_branch", emp["branch"])
    frappe.db.set_value("Lead", lead_name, "custom_district", emp["custom_district"])

    # ✅ Update lead_owner with the employee's user_id
    frappe.db.set_value("Lead", lead_name, "lead_owner", emp["user_id"])

    frappe.db.commit()

    return {
        "status": "success",
        "employee": emp,
        "lead_owner": emp["user_id"]
    }

# Get assigned employee info 
@frappe.whitelist()
def get_assigned_employee_info(lead_name):
    """Fetch first assigned employee linked to the Lead via _assign"""
    # Find assigned users from ToDo
    assigned = frappe.get_all(
        "ToDo",
        filters={"reference_type": "Lead", "reference_name": lead_name, "status": "Open"},
        fields=["allocated_to"],
        limit_page_length=1
    )
    if not assigned:
        return None

    user = assigned[0].allocated_to

    # Map user to Employee
    emp = frappe.get_all(
        "Employee",
        filters={"user_id": user},
        fields=["employee_name", "branch", "employee_number", "designation"],
        limit_page_length=1
    )
    if not emp:
        return {"employee_name": user, "branch": "-", "employee_number": "-", "designation": "-"}
    return emp[0]

# Get lead owner info
@frappe.whitelist()
def get_lead_owner_info(lead_name):
    """
    Return lead owner details: name, employee_number, branch, designation
    """
    lead = frappe.get_doc("Lead", lead_name)
    
    if not lead.lead_owner:
        return {}

    # Assuming 'lead_owner' links to a User, and each User has employee info
    employee = frappe.get_all(
        "Employee",
        filters={"user_id": lead.owner},
        fields=["employee_name", "employee_number", "branch", "designation"],
        limit_page_length=1,
    )

    if employee:
        return employee[0]
    
    return {}


@frappe.whitelist()
def get_users_by_branch(doctype, txt, searchfield, start, page_len, filters):
    """
    Get users based on the selected branch through Employee relationship
    """
    branch = filters.get('branch')
    
    if not branch:
        return []
    
    # Query to get users linked to employees in the selected branch
    users = frappe.db.sql("""
        SELECT DISTINCT u.name, u.full_name
        FROM `tabUser` u
        INNER JOIN `tabEmployee` e ON u.name = e.user_id
        WHERE e.branch = %(branch)s
        AND u.enabled = 1
        AND u.name != 'Administrator'
        AND u.name != 'Guest'
        AND (u.name LIKE %(txt)s OR u.full_name LIKE %(txt)s)
        ORDER BY u.full_name
        LIMIT %(start)s, %(page_len)s
    """, {
        'branch': branch,
        'txt': f'%{txt}%',
        'start': start,
        'page_len': page_len
    })
    
    return users


# Get employee designation by user
@frappe.whitelist()
def get_employee_designation_by_user(user):
    employee = frappe.db.get_value(
        "Employee",
        {"user_id": user},
        ["designation"],
        as_dict=True,
    )
    return employee.designation if employee else None

@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_users_by_branch_and_designation(
    doctype, txt, searchfield, start, page_len, filters
):
    return frappe.db.sql("""
        SELECT u.name, u.full_name
        FROM `tabUser` u
        INNER JOIN `tabEmployee` e ON e.user_id = u.name
        WHERE e.branch = %(branch)s
          AND e.designation = %(designation)s
          AND u.enabled = 1
          AND u.name NOT IN ('Administrator', 'Guest')
          AND (u.name LIKE %(txt)s OR u.full_name LIKE %(txt)s)
        ORDER BY u.full_name
        LIMIT %(start)s, %(page_len)s
    """, {
        "branch": filters.get("branch"),
        "designation": filters.get("designation"),
        "txt": f"%{txt}%",
        "start": start,
        "page_len": page_len,
    })
