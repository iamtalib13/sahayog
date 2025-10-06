import frappe
from frappe import _

# Function to update employee details in the Lead document
def update_employee_details(doc, method):
    if frappe.session.user != "Administrator":
        try:
            # Fetch employee_number and location fields using get_value with tuple unpacking
            result = frappe.db.get_value(
                "Employee",
                {"user_id": frappe.session.user},
                ["employee_number", "branch", "custom_region", "custom_zone"],
            )

            if not result:
                frappe.throw("Could not fetch employee details. Please ensure your employee profile is properly set.")

            employee_number, branch, region, zone = result

            # Always set employee number
            doc.custom_employee_id = employee_number

            # Conditionally set other fields if values are available
            if branch:
                doc.custom_branch = branch
            if region:
                doc.custom_region = region
            if zone:
                doc.custom_zone = zone

        except Exception:
            frappe.log_error(frappe.get_traceback(), "Lead Update Employee Details Error")
            frappe.throw("An error occurred while updating employee details.")

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

@frappe.whitelist()
def assign_employee_to_lead(lead_name, user):
    """
    Assigns a user to a lead and sets custom fields based on Employee doctype
    """
    if not lead_name or not user:
        frappe.throw(frappe._("Lead name and user are required"))

    # Fetch Employee linked to this user
    employee = frappe.get_all(
        "Employee",
        filters={"user_id": user},
        fields=["name", "custom_zone", "custom_region", "branch"],
        limit=1,
    )

    if not employee:
        frappe.throw(frappe._("No Employee found for this user"))

    emp = employee[0]

    # Update the Lead
    frappe.db.set_value("Lead", lead_name, "custom_employee_id", emp["name"])
    frappe.db.set_value("Lead", lead_name, "custom_zone", emp["custom_zone"])
    frappe.db.set_value("Lead", lead_name, "custom_region", emp["custom_region"])
    frappe.db.set_value("Lead", lead_name, "custom_branch", emp["branch"])


    frappe.db.commit()

    return {"status": "success", "employee": emp}

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
        fields=["employee_name", "branch", "employee_number"],
        limit_page_length=1
    )
    if not emp:
        return {"employee_name": user, "branch": "-", "employee_number": "-"}

    return emp[0]

# Get lead owner info
@frappe.whitelist()
def get_lead_owner_info(lead_name):
    """
    Return lead owner details: name, employee_number, branch
    """
    lead = frappe.get_doc("Lead", lead_name)
    
    if not lead.lead_owner:
        return {}

    # Assuming 'lead_owner' links to a User, and each User has employee info
    employee = frappe.get_all(
        "Employee",
        filters={"user_id": lead.lead_owner},
        fields=["employee_name", "employee_number", "branch"],
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

