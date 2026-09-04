import frappe

def has_lead_permission(doc, ptype, user):
    if not user:
        user = frappe.session.user

    user_roles = frappe.get_roles(user)

    if "Administrator" in user_roles or "Sales Manager" in user_roles or "System Manager" in user_roles:
        return True

    if "Branch Manager" in user_roles:
        if ptype == "create":
            return True

        if not doc:
            return None

        if not doc.get("sol_id"):
            return None

        user_sol_ids = get_user_sol_ids(user)
        if str(doc.sol_id) in [str(s) for s in user_sol_ids]:
            return True

        if doc.owner == user:
            return True

        return False

    return None


def get_user_sol_ids(user):
    if not user:
        return []

    rp = frappe.db.get_value("Report Preference", {"user": user, "enabled": 1}, "name")
    if not rp and frappe.db.exists("Report Preference", user):
        if frappe.db.get_value("Report Preference", user, "enabled"):
            rp = user

    if not rp:
        return []

    doc = frappe.get_doc("Report Preference", rp)

    # Pre-fetch all child records
    zones = [d.zone for d in doc.get("zone", []) if d.get("zone")]
    regions = [d.region for d in doc.get("region", []) if d.get("region")]
    states = [d.state for d in doc.get("state", []) if d.get("state")]
    districts = [d.district for d in doc.get("district", []) if d.get("district")]
    specific_sols = [str(d.sol_id) for d in doc.get("sol_id", []) if d.get("sol_id")]

    # Build geo query conditions
    geo_conditions = []
    values = {}

    if zones:
        geo_conditions.append("zone IN %(zones)s")
        values["zones"] = tuple(zones)
    if regions:
        expanded_regions = []
        for r in regions:
            expanded_regions.append(r)
            if str(r).upper() in ["HO", "HEAD OFFICE"]:
                for ho_variant in ["HO", "Head Office", "HEAD OFFICE"]:
                    if ho_variant not in expanded_regions:
                        expanded_regions.append(ho_variant)
        geo_conditions.append("region IN %(regions)s")
        values["regions"] = tuple(expanded_regions)
    if states:
        geo_conditions.append("state IN %(states)s")
        values["states"] = tuple(states)
    if districts:
        geo_conditions.append("district IN %(districts)s")
        values["districts"] = tuple(districts)

    db_sols = []
    if geo_conditions:
        where_clause = " AND ".join(["(branch_type IS NULL OR branch_type != 'Zonal')", "sol_id IS NOT NULL"] + geo_conditions)
        db_sols = frappe.db.sql(
            f"SELECT DISTINCT sol_id FROM `tabSahayog Branch` WHERE {where_clause}",
            values,
            pluck=True
        )

    # Union geo resolved sols with any specific sol_ids configured
    all_sols = list(dict.fromkeys([str(s) for s in db_sols if s] + [str(s) for s in specific_sols if s]))
    return all_sols


def get_lead_permission(user, doctype=None):
    if not user:
        user = frappe.session.user

    user_roles = frappe.get_roles(user)

    if "Administrator" in user_roles or "Sales Manager" in user_roles or "Operations Support Manager" in user_roles:
        return ""

    conditions = []

    user_sols = get_user_sol_ids(user)
    if user_sols:
        sol_list = ", ".join(f"'{s}'" for s in user_sols)
        conditions.append(f"(`tabLead`.sol_id IN ({sol_list}))")

    conditions.append(f"`tabLead`.owner = '{user}'")
    conditions.append(f"`tabLead`._assign LIKE '%\"{user}\"%'")

    return " or ".join(conditions) if conditions else ""


def get_user_report_preference_filters(user):
    rp = frappe.db.get_value("Report Preference", {"user": user, "enabled": 1}, "name")
    if not rp:
        return None

    doc = frappe.get_doc("Report Preference", rp)
    all_sols = get_user_sol_ids(user)

    result = {
        "sol_ids": all_sols,
        "zones": [d.get("zone") for d in doc.get("zone", []) if d.get("zone")],
        "regions": [d.get("region") for d in doc.get("region", []) if d.get("region")],
        "is_all_regions": bool(doc.get("all_regions")),
    }

    return result



# Set the permissions visibility on doc of Appointment
def get_appointment_permission(user):
    if not user:
        user = frappe.session.user

    # Allow Administrator and Sales Manager to see all records
    user_roles = frappe.get_roles(user)
    if "Administrator" in user_roles or "Sales Manager" in user_roles:
        return ""

    conditions = []

   # Extra access for Branch Manager
    if "Branch Manager" in user_roles:
        user_branch = frappe.db.get_value("Employee", {"user_id": user}, "branch")
        if user_branch:
            # Add condition: show appointments linked to Leads in same branch
            conditions.append(f"""
                (
                    `tabAppointment`.appointment_with = 'Lead'
                    AND EXISTS (
                        SELECT 1 FROM `tabLead`
                        WHERE `tabLead`.name = `tabAppointment`.party
                        AND `tabLead`.custom_branch = '{user_branch}'
                    )
                )
            """)

    conditions.append(f"`tabAppointment`.owner = '{user}'")

    # Add condition for assigned user (stored as a JSON string in _assign)
    conditions.append(f"`tabAppointment`._assign LIKE '%\"{user}\"%'")

    # Add condition for escalated user if used
    # conditions.append(f"`tabAppointment`.custom_escalated_to = '{user}'")

    return " or ".join(conditions) if conditions else ""

def get_task_permission(user):
    """Filter Task list based on user roles and assignment"""
    if not user:
        user = frappe.session.user

    # Roles jo hamesha sab tasks dekh sakte hain
    allowed_roles = ["System Manager", "Task Manager", "Project Manager"]
    user_roles = frappe.get_roles(user)
    if any(role in allowed_roles for role in user_roles):
        return ""  # no filter, show all tasks

    # Employees: only tasks where they are in _assign
    # safe LIKE filter
    return f"""(`tabTask`.`_assign` LIKE '%"{user}"%')"""

# permission query_conditions for purchase receipt based on warehouse(inward)
def get_purchase_receipt_permission_for_warehouse(user, doctype=None):
    if not user:
        user = frappe.session.user

    # Admin can see all
    if user == "Administrator":
        return ""

    # Allow owner to see their own records
    # Also allow warehouse match
    return f"""
        (`tabPurchase Receipt`.owner = '{user}'
        or exists(
            select 1
            from `tabDefault Warehouse` dw
            where dw.parenttype = 'Sahayog Settings'
            and dw.user_id = '{user}'
            and dw.warehouse = `tabPurchase Receipt`.set_warehouse
        ))
    """

def get_stock_entry_permission_for_warehouse(user, doctype=None):
    if not user:
        user = frappe.session.user

    if user == "Administrator":
        return ""

    return f"""
        (
            `tabStock Entry`.owner = '{user}'
            or exists(
                select 1
                from `tabDefault Warehouse` dw
                where dw.parenttype = 'Sahayog Settings'
                and dw.user_id = '{user}'
                and dw.warehouse = `tabStock Entry`.from_warehouse
            )
        )
    """

def get_shareholder_permission(user, doctype=None):
    if not user:
        user = frappe.session.user

    # Administrator can see all
    if user == "Administrator":
        return ""

    roles = frappe.get_roles(user)

    # Roles with full access
    if "System Manager" in roles or "Share Admin" in roles:
        return ""

    # Only Share User allowed with sol_id filter
    if "Share User" in roles:
        sol_id = frappe.db.get_value("Employee", {"user_id": user}, "sol_id")
        if sol_id:
            return f"(`tabShareholder`.sol_id = '{sol_id}')"
        else:
            frappe.msgprint("You don't have access")
            return "1=0"

    # No access otherwise
    frappe.msgprint("You don't have access")
    return "1=0"


def get_share_transfer_permission(user, doctype=None):
    if not user:
        user = frappe.session.user

    # Administrator can see all
    if user == "Administrator":
        return ""

    roles = frappe.get_roles(user)

    # Roles with full access
    if "System Manager" in roles or "Share Admin" in roles:
        return ""

    # Only Share User allowed with sol_id filter
    if "Share User" in roles:
        sol_id = frappe.db.get_value("Employee", {"user_id": user}, "sol_id")
        if sol_id:
            return f"(`tabShare Transfer`.sol_id = '{sol_id}')"
        else:
            frappe.msgprint("You don't have access")
            return "1=0"

    # No access otherwise
    frappe.msgprint("You don't have access")
    return "1=0"
def get_employee_material_request_permission(user=None, doctype=None):
    if not user:
        user = frappe.session.user

    user_roles = frappe.get_roles(user)

    # Administrator & Head Office Officer → full access
    if "Administrator" in user_roles or "Head Office Officer" in user_roles:
        return ""

    # Base conditions (Owner, Reporting Person, HO Officer, Employee)
    conditions = [
        f"`tabEmployee Material Request`.owner = '{user}'",
        f"`tabEmployee Material Request`.reporting_person = '{user}'",
        f"`tabEmployee Material Request`.head_office_officer = '{user}'"
    ]

    # Add condition for the 'employee' field
    current_employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if current_employee:
        conditions.append(f"`tabEmployee Material Request`.employee = '{current_employee}'")

    # Sahayog Settings (Default Warehouse) access
    conditions.append(f"""
        exists(
            select 1
            from `tabDefault Warehouse` dw
            where dw.parent = 'Sahayog Settings'
            and dw.user_id = '{user}'
            and (
                dw.warehouse = `tabEmployee Material Request`.source_warehouse
                or dw.warehouse = `tabEmployee Material Request`.target_warehouse
            )
        )
    """)

    # Purchase Department access: show if department is Purchase OR show_to_purchase is checked
    if "Purchase Department" in user_roles:
        conditions.append("(`tabEmployee Material Request`.department = 'Purchase' OR `tabEmployee Material Request`.show_to_purchase = 1)")

    # IT Department access: if user is in Sahayog Settings and belongs to IT department
    user_dept = frappe.db.get_value("Employee", {"user_id": user}, "department")
    if user_dept == "Information Technology":
        if frappe.db.exists("Default Warehouse", {"parent": "Sahayog Settings", "user_id": user}):
            conditions.append("`tabEmployee Material Request`.department = 'it'")

    # Store Manager → also see records from their branch/sol_id warehouse
    if any("Store Manager" in role for role in user_roles):
        emp = frappe.db.get_value("Employee", {"user_id": user}, ["branch", "sol_id"], as_dict=True)
        
        if emp:
            # Clean prefixes like 'Branch - ' to ensure Gondia HO matches Branch - Gondia HO
            if emp.branch:
                branch_val = emp.branch.replace("Branch - ", "").strip()
                conditions.append(f"LOWER(`tabEmployee Material Request`.source_warehouse) LIKE LOWER('%{branch_val}%')")
            
            if emp.sol_id:
                sol_val = str(emp.sol_id).replace("Branch - ", "").strip()
                conditions.append(f"LOWER(`tabEmployee Material Request`.source_warehouse) LIKE LOWER('%{sol_val}%')")

    return f"({' OR '.join(conditions)})"


def get_item_permission(user, doctype=None):
    if not user:
        user = frappe.session.user

    # Admin and System Manager can see all
    user_roles = frappe.get_roles(user)
    if "Administrator" in user_roles or "System Manager" in user_roles:
        return ""

    # Get employee department
    dept = frappe.db.get_value("Employee", {"user_id": user}, "department")

    if dept == "Information Technology":
        # IT department users see only IT items
        return "(`tabItem`.custom_item_department = 'IT')"
    else:
        # Non-IT department users see everything EXCEPT IT items
        return "(`tabItem`.custom_item_department != 'IT' OR `tabItem`.custom_item_department IS NULL OR `tabItem`.custom_item_department = '')"


def has_item_permission(doc, ptype, user):
    if not user:
        user = frappe.session.user

    user_roles = frappe.get_roles(user)
    if "Administrator" in user_roles or "System Manager" in user_roles:
        return True

    dept = frappe.db.get_value("Employee", {"user_id": user}, "department")
    item_dept = doc.get("custom_item_department")

    if dept == "Information Technology":
        # IT department users can only see/access IT items
        return item_dept == "IT"
    else:
        # Non-IT department users cannot see/access IT items
        return item_dept != "IT"


def get_loan_application_permission(user, doctype=None):
    if not user:
        user = frappe.session.user

    user_roles = frappe.get_roles(user)
    if "Administrator" in user_roles or "System Manager" in user_roles or "Credit Loan User" in user_roles or "CPC Loan User" in user_roles:
        return ""

    emp = frappe.db.get_value("Employee", {"user_id": user}, ["name", "sol_id"], as_dict=True)
    if not emp:
        return f"(`tabLoan Application`.owner = '{user}')"

    emp_code = emp.name

    # If document has been re-assigned to another LC (lead_converter != current employee), exclude previous generator
    conditions = [
        f"`tabLoan Application`.lead_converter = '{emp_code}'",
        f"(`tabLoan Application`.owner = '{user}' AND (`tabLoan Application`.lead_converter IS NULL OR `tabLoan Application`.lead_converter = '' OR `tabLoan Application`.lead_converter = '{emp_code}'))",
        f"`tabLoan Application`.name IN (SELECT share_name FROM `tabDocShare` WHERE share_doctype = 'Loan Application' AND user = '{user}')"
    ]

    return f"({' OR '.join(conditions)})"


def has_loan_application_permission(doc, ptype, user=None):
    if not user:
        user = frappe.session.user

    user_roles = frappe.get_roles(user)
    if "Administrator" in user_roles or "System Manager" in user_roles or "Credit Loan User" in user_roles or "CPC Loan User" in user_roles:
        return True

    if not doc:
        return True

    emp = frappe.db.get_value("Employee", {"user_id": user}, ["name", "sol_id"], as_dict=True)
    emp_code = emp.name if emp else None

    # If case is assigned to another LC, stop all access for previous generator/owner
    if doc.lead_converter and emp_code and doc.lead_converter != emp_code:
        return False

    if doc.lead_converter and emp_code and doc.lead_converter == emp_code:
        return True

    if doc.owner == user:
        return True

    shared = frappe.db.exists("DocShare", {
        "share_doctype": "Loan Application",
        "share_name": doc.name,
        "user": user
    })
    if shared:
        return True

    return False