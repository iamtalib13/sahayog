import frappe
from frappe.utils import format_datetime

def execute(filters=None):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    filters = filters or {}
    lead_filters = {}

    unrestricted_roles = {"Administrator", "System Manager", "Admin", "Sales Manager"}

    # 🔐 Apply role-based filtering
    if not any(role in roles for role in unrestricted_roles):
        employee = frappe.db.get_value(
            "Employee",
            {"user_id": user},
            ["name", "branch", "custom_zone", "custom_region"],
            as_dict=True
        )

        if not employee:
            frappe.throw(f"Employee record not found for user: {user}")

        if "Branch Manager" in roles and employee.branch:
            lead_filters["custom_branch"] = employee.branch

        elif "Regional Manager" in roles and employee.custom_region and employee.custom_zone:
            lead_filters["custom_region"] = employee.custom_region
            lead_filters["custom_zone"] = employee.custom_zone

        elif "Zonal Manager" in roles and employee.custom_zone:
            lead_filters["custom_zone"] = employee.custom_zone

        else:
            frappe.throw("Your Employee record is missing branch, region, or zone info.")

    # 📅 Strictly filter leads created TODAY only
    today = frappe.utils.today()
    lead_filters["creation"] = ["between", [f"{today} 00:00:00", f"{today} 23:59:59"]]



    # 📦 Fetch leads with standard fields only
    leads = frappe.db.get_all(
        "Lead",
        filters=lead_filters,
        fields=[
            "name", "lead_name", "status", "source", "custom_branch", 
            "custom_zone", "custom_region", "creation", "lead_owner",
            "phone", "email_id"
        ]
    )

    # 👤 Get employee mapping - FIXED: Include employee_number
    lead_owners = list(set(lead.get("lead_owner") for lead in leads if lead.get("lead_owner")))
    employees = []
    if lead_owners:
        try:
            employees = frappe.db.get_all(
                "Employee", 
                filters={"user_id": ["in", lead_owners]},
                fields=["name", "employee_name", "employee_number", "user_id", "designation", "branch"]
            )
        except:
            employees = []
    
    employee_map = {emp.user_id: emp for emp in employees}

    # 🏢 Get branch SOL mapping safely
    branch_sol_map = {}
    try:
        branches = frappe.db.get_all("Branch", fields=["name", "sol_id"])
        branch_sol_map = {b.name: b.sol_id for b in branches}
    except:
        pass

    # 📊 Process leads with product expansion
    report_data = []
    row_idx = 1
    
    for lead in leads:
        lead_owner = lead.get("lead_owner")
        emp = employee_map.get(lead_owner)
        
        # ✅ FIXED: Employee Name = Full Name, Employee ID = employee_number
        emp_name = emp.employee_name if emp else lead_owner or "Unknown"
        emp_id = getattr(emp, 'employee_number', '-') if emp else "-"
        designation = getattr(emp, 'designation', '-') if emp else "-"
        emp_branch = getattr(emp, 'branch', lead.custom_branch or '-') if emp else lead.custom_branch or "-"
        
        # ✅ District from employee doc safely
        emp_district = "-"
        try:
            if emp:
                emp_doc = frappe.get_doc("Employee", emp.name)
                emp_district = (emp_doc.get('custom_district') or "-")
        except:
            pass
        sol_id = branch_sol_map.get(emp_branch, "-")
        
        # Format contact info from standard fields
        contact = ""
        if lead.phone:
            contact = lead.phone
        elif lead.email_id:
            contact = lead.email_id
        else:
            contact = "-"
    
        # ✅ PERFECT MATCH: Your exact "Lead Product" child table structure
        products = []
        try:
            products = frappe.db.get_all(
                "Lead Product",
                filters={"parent": lead.name},
                fields=["product", "product_name", "product_amount"],
                limit=20
            )
        except:
            products = []
        
        if products:
            # ✅ Multiple rows for products - EXACT field mapping
            for product in products:
                product_code = product.get("product") or "-"
                product_name = product.get("product_name") or "-"
                amount = float(product.get("product_amount") or 0)
                
                report_data.append({
                    "row_idx": row_idx,
                    "status": lead.status,
                    "lead_name": lead.name,
                    "customer": lead.lead_name or "-",
                    "contact": contact,
                    "source": lead.source or "-",
                    "product_code": product_code,
                    "product_name": product_name,
                    "amount": frappe.utils.fmt_money(amount, currency=None),
                    "employee_name": emp_name,      # ✅ Full Name (emp.name)
                    "employee_id": emp_id,          # ✅ Employee Number (employee_number)
                    "designation": designation,
                    "sol_id": sol_id,
                    "branch": emp_branch,
                    "district": emp_district,
                    "region": lead.custom_region or "-",
                    "zone": lead.custom_zone or "-",
                    "creation": format_datetime(lead.creation, "MMM dd, yyyy hh:mm a")
                })
                row_idx += 1
        else:
            # Single row without products
            report_data.append({
                "row_idx": row_idx,
                "status": lead.status,
                "lead_name": lead.name,
                "customer": lead.lead_name or "-",
                "contact": contact,
                "source": lead.source or "-",
                "product_code": "-",
                "product_name": "-",
                "amount": "-",
                "employee_name": emp_name,      # ✅ Full Name (emp.name)
                "employee_id": emp_id,          # ✅ Employee Number (employee_number)
                "designation": designation,
                "sol_id": sol_id,
                "branch": emp_branch,
                "district": emp_district,
                "region": lead.custom_region or "-",
                "zone": lead.custom_zone or "-",
                "creation": format_datetime(lead.creation, "MMM dd, yyyy hh:mm a")
            })
            row_idx += 1

    # 📊 Complete column definition matching UI
    columns = [
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 100},
        {"label": "Lead ID", "fieldname": "lead_name", "fieldtype": "Link", "options": "Lead", "width": 120},
        {"label": "Customer", "fieldname": "customer", "fieldtype": "Data", "width": 150},
        {"label": "Contact", "fieldname": "contact", "fieldtype": "Data", "width": 110},
        {"label": "Source", "fieldname": "source", "fieldtype": "Data", "width": 100},
        {"label": "Product Code", "fieldname": "product_code", "fieldtype": "Data", "width": 120},
        {"label": "Product Name", "fieldname": "product_name", "fieldtype": "Data", "width": 200},
        {"label": "Amount", "fieldname": "amount", "fieldtype": "Currency", "width": 120},
        {"label": "Employee Name", "fieldname": "employee_name", "fieldtype": "Data", "width": 150},
        {"label": "Employee ID", "fieldname": "employee_id", "fieldtype": "Data", "width": 100},
        {"label": "Designation", "fieldname": "designation", "fieldtype": "Data", "width": 120},
        {"label": "SOL ID", "fieldname": "sol_id", "fieldtype": "Data", "width": 100},
        {"label": "Branch", "fieldname": "branch", "fieldtype": "Link", "options": "Branch", "width": 120},
        {"label": "District", "fieldname": "district", "fieldtype": "Data", "width": 100},
        {"label": "Region", "fieldname": "region", "fieldtype": "Link", "options": "Region", "width": 100},
        {"label": "Zone", "fieldname": "zone", "fieldtype": "Link", "options": "Zone", "width": 100},
        {"label": "Created On", "fieldname": "creation", "fieldtype": "Data", "width": 160},
    ]

    return columns, report_data
