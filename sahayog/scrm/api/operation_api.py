import frappe


def has_full_report_access():
    """Check if user has admin or operations manager access"""
    roles = frappe.get_roles(frappe.session.user)
    return ("System Manager" in roles or 
            "Administrator" in roles or 
            "Operations Support Manager" in roles)


@frappe.whitelist()
def get_operation_lead_report(from_date=None, to_date=None):
    """
    Custom API to fetch detailed lead report with product breakdown.
    Includes child table data from 'Lead Product' and employee details
    from 'Employee' doctype.
    Owner data from 'owner' field and Assigned data from 'lead_owner' field.
    Operations Support Manager gets full access like Admin.
    """
    try:
        # ========== Build Lead filters ==========
        lead_filters = [["custom_is_operation_lead", "=", 1]]

        # ✅ Operations Support Manager full access
        if not has_full_report_access():
            # Regular users get only their leads
            lead_filters.append([
                "OR",
                ["owner", "=", frappe.session.user],
                ["lead_owner", "=", frappe.session.user]
            ])

        if from_date:
            lead_filters.append(["creation", ">=", f"{from_date} 00:00:00"])
        if to_date:
            lead_filters.append(["creation", "<=", f"{to_date} 23:59:59"])

        # ========== Fetch Leads (permission-safe) ==========
        leads = frappe.get_list(
            "Lead",
            fields=[
                "name",
                "lead_name", 
                "mobile_no",
                "email_id",
                "status",
                "source",
                "lead_owner",
                "owner",
                "creation"
            ],
            filters=lead_filters,
            order_by="creation desc",
            limit_page_length=0
            # ✅ REMOVED: as_dict=True (not supported in get_list)
        )

        # ✅ FIXED: Handle status field (might be list for multi-select)
        for lead in leads:
            if hasattr(lead, 'status') and isinstance(lead.status, list):
                lead.status = lead.status[0] if lead.status else ""
            # Ensure other fields are strings
            if hasattr(lead, 'lead_name'):
                lead.lead_name = lead.lead_name or ""
            if hasattr(lead, 'mobile_no'):
                lead.mobile_no = lead.mobile_no or ""
            if hasattr(lead, 'source'):
                lead.source = lead.source or ""

        # ========== Fetch Lead Products in bulk ==========
        lead_names = [lead.name for lead in leads]
        products_map = {}
        if lead_names:
            products = frappe.get_all(
                "Lead Product",
                filters={"parent": ["in", lead_names]},
                fields=["parent", "product", "product_name", "product_amount", "idx"],
                order_by="idx"
            )
            # Map products by parent Lead
            for p in products:
                products_map.setdefault(p.parent, []).append({
                    "product": p.product or "",
                    "product_name": p.product_name or "",
                    "amount": p.product_amount or 0,
                    "idx": p.idx or 0
                })

        # ========== Fetch Employee details for both lead_owner and owner ==========
        all_user_ids = list({lead.lead_owner for lead in leads if getattr(lead, 'lead_owner', None)} | 
                           {lead.owner for lead in leads if getattr(lead, 'owner', None)})
        employees_map = {}
        if all_user_ids:
            employees = frappe.get_all(
                "Employee",
                filters={"user_id": ["in", all_user_ids]},
                fields=[
                    "name",
                    "user_id", 
                    "employee_name",
                    "designation",
                    "branch",
                    "sol_id",
                    "custom_region",
                    "custom_zone",
                    "custom_district",
                    "employee_number"
                ],
                ignore_permissions=True
            )
            for emp in employees:
                employees_map[emp.user_id] = emp

        # ========== Combine data ==========
        detailed_leads = []
        total_amount = 0
        for lead in leads:
            # Owner employee (from owner field)
            owner_emp = employees_map.get(getattr(lead, 'owner', ''), {})
            # Assigned employee (from lead_owner field)
            assigned_emp = employees_map.get(getattr(lead, 'lead_owner', ''), {})
            
            lead_products = products_map.get(lead.name, [])
            
            # Calculate total amount for summary
            for product in lead_products:
                total_amount += float(product["amount"] or 0)
            
            detailed_leads.append({
                "name": lead.name,
                "lead_name": getattr(lead, 'lead_name', ''),
                "mobile_no": getattr(lead, 'mobile_no', ''),
                "email_id": getattr(lead, 'email_id', ''),
                "status": getattr(lead, 'status', ''),
                "source": getattr(lead, 'source', ''),
                "lead_owner": getattr(lead, 'lead_owner', ''),
                "owner": getattr(lead, 'owner', ''),
                "creation": getattr(lead, 'creation', ''),
                "products": lead_products,
                "owner_details": owner_emp,  # From owner field
                "assigned_employee_details": assigned_emp  # From lead_owner field
            })

        # ========== Summary (with total_amount added) ==========
        summary = {
            "total_leads": len(detailed_leads),
            "total_amount": total_amount,
            "from_date": from_date,
            "to_date": to_date,
            "unique_leads": len(leads)
        }

        return {
            "success": True,
            "data": detailed_leads,
            "summary": summary
        }

    except Exception as e:
        frappe.log_error(message=frappe.get_traceback(), title="Lead Report Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_employee_lead_summary(from_date=None, to_date=None):
    """
    Return total leads per employee for the given date range.
    Respects Lead doctype permissions.
    Shows both Owner (owner) and Assigned (lead_owner) counts.
    Operations Support Manager gets full access like Admin.
    """
    try:
        # Build lead filters
        lead_filters = [["custom_is_operation_lead", "=", 1]]

        # ✅ Operations Support Manager full access
        if not has_full_report_access():
            # Regular users get only their leads
            lead_filters.append([
                "OR",
                ["owner", "=", frappe.session.user],
                ["lead_owner", "=", frappe.session.user]
            ])

        if from_date:
            lead_filters.append(["creation", ">=", f"{from_date} 00:00:00"])
        if to_date:
            lead_filters.append(["creation", "<=", f"{to_date} 23:59:59"])

        # Fetch leads with permission check
        leads = frappe.get_list(
            "Lead",
            filters=lead_filters,
            fields=["lead_owner", "owner", "name"],
            order_by="lead_owner"
            # ✅ REMOVED: as_dict=True (not supported)
        )

        # Count leads per employee (both owner and assigned)
        owner_count_map = {}
        assigned_count_map = {}
        
        for lead in leads:
            # Count by owner (owner)
            if getattr(lead, 'owner', None):
                owner_count_map[lead.owner] = owner_count_map.get(lead.owner, 0) + 1
            # Count by assigned (lead_owner)
            if getattr(lead, 'lead_owner', None):
                assigned_count_map[lead.lead_owner] = assigned_count_map.get(lead.lead_owner, 0) + 1

        # Fetch employee details ignoring permissions
        all_user_ids = list(set(list(owner_count_map.keys()) + list(assigned_count_map.keys())))
        employees = {}
        if all_user_ids:
            emp_list = frappe.get_all(
                "Employee",
                filters={"user_id": ["in", all_user_ids]},
                fields=[
                    "name",
                    "user_id",
                    "employee_name",
                    "designation", 
                    "sol_id",
                    "branch",
                    "custom_district"
                ],
                ignore_permissions=True
            )
            for emp in emp_list:
                employees[emp.user_id] = emp

        # Combine data with both owner and assigned counts
        data = []
        processed_users = set()
        
        # Add owner data
        for user_id, count in owner_count_map.items():
            emp = employees.get(user_id, {})
            assigned_count = assigned_count_map.get(user_id, 0)
            data.append({
                "Employee ID": emp.get("name") or "",
                "Employee Name": emp.get("employee_name") or "",
                "Designation": emp.get("designation") or "",
                "SOL ID": emp.get("sol_id") or "",
                "Branch": emp.get("branch") or "",
                "District": emp.get("custom_district") or "",
                "Owner Leads": count,
                "Assigned Leads": assigned_count
            })
            processed_users.add(user_id)
        
        # Add remaining assigned users not in owner list
        for user_id, count in assigned_count_map.items():
            if user_id not in processed_users:
                emp = employees.get(user_id, {})
                data.append({
                    "Employee ID": emp.get("name") or "",
                    "Employee Name": emp.get("employee_name") or "",
                    "Designation": emp.get("designation") or "",
                    "SOL ID": emp.get("sol_id") or "",
                    "Branch": emp.get("branch") or "",
                    "District": emp.get("custom_district") or "",
                    "Owner Leads": 0,
                    "Assigned Leads": count
                })

        return {"success": True, "data": data}

    except Exception as e:
        frappe.log_error(message=frappe.get_traceback(), title="Employee Lead Summary Error")
        return {"success": False, "error": str(e)}
