import frappe

@frappe.whitelist()
def get_operation_lead_report(from_date=None, to_date=None):
    """
    Custom API to fetch detailed lead report with product breakdown.
    Includes child table data from 'Lead Product' and employee details
    from 'Employee' doctype.
    """
    try:
        # ========== Build Lead filters ==========
        lead_filters = [["custom_is_operation_lead", "=", 1]]

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
                "creation"
            ],
            filters=lead_filters,
            order_by="creation desc",
            limit_page_length=0
        )

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

        # ========== Fetch Employee details (ignore permissions) ==========
        employee_user_ids = list({lead.lead_owner for lead in leads if lead.lead_owner})
        employees_map = {}
        if employee_user_ids:
            employees = frappe.get_all(
                "Employee",
                filters={"user_id": ["in", employee_user_ids]},
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
        for lead in leads:
            owner = employees_map.get(lead.lead_owner, {})
            lead_products = products_map.get(lead.name, [])
            
            detailed_leads.append({
                "name": lead.name,
                "lead_name": lead.lead_name,
                "mobile_no": lead.mobile_no,
                "email_id": lead.email_id,
                "status": lead.status,
                "source": lead.source,
                "lead_owner": lead.lead_owner,
                "creation": lead.creation,
                "products": lead_products,
                "lead_owner_details": owner
            })

        # ========== Summary ==========
        summary = {
            "total_leads": len(detailed_leads),
            "from_date": from_date,
            "to_date": to_date
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
    """
    try:
        # Build lead filters
        lead_filters = [["custom_is_operation_lead", "=", 1]]

        if from_date:
            lead_filters.append(["creation", ">=", f"{from_date} 00:00:00"])
        if to_date:
            lead_filters.append(["creation", "<=", f"{to_date} 23:59:59"])

        # Fetch leads with permission check
        leads = frappe.get_list(
            "Lead",
            filters=lead_filters,
            fields=["lead_owner", "name"],
            order_by="lead_owner"
        )

        # Count leads per owner
        lead_count_map = {}
        for lead in leads:
            if lead.lead_owner:
                lead_count_map[lead.lead_owner] = lead_count_map.get(lead.lead_owner, 0) + 1

        # Fetch employee details ignoring permissions
        user_ids = list(lead_count_map.keys())
        employees = {}
        if user_ids:
            emp_list = frappe.get_all(
                "Employee",
                filters={"user_id": ["in", user_ids]},
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

        # Combine
        data = []
        for user_id, count in lead_count_map.items():
            emp = employees.get(user_id, {})
            data.append({
                "Employee ID": emp.get("name") or "",
                "Employee Name": emp.get("employee_name") or "",
                "Designation": emp.get("designation") or "",
                "SOL ID": emp.get("sol_id") or "",
                "Branch": emp.get("branch") or "",
                "District": emp.get("custom_district") or "",
                "Total Leads": count
            })

        return {"success": True, "data": data}

    except Exception as e:
        frappe.log_error(message=frappe.get_traceback(), title="Employee Lead Summary Error")
        return {"success": False, "error": str(e)}
