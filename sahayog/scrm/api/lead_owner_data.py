# apps/sahayog/sahayog/scrm/api/lead_owner_data.py
import frappe
import json
from frappe import _

@frappe.whitelist()
def get_complete_crm_data(filters=None, limit_start=0, limit_page_length=50):
    try:
        # Parse filters if provided as JSON string
        if filters and isinstance(filters, str):
            filters = frappe.parse_json(filters)
        
        # Convert string parameters to integers
        try:
            limit_start = int(limit_start)
        except (ValueError, TypeError):
            limit_start = 0
            
        try:
            limit_page_length = int(limit_page_length)
        except (ValueError, TypeError):
            limit_page_length = 50
        
        # ========== EMPLOYEE DATA - NO PERMISSION ==========
        employees = frappe.get_all("Employee", 
            fields=[
                "name", "employee_name", "user_id", "designation", 
                "branch", "employee_number", "first_name", "last_name", 
                "custom_district", "department", "company", "reports_to",
                "date_of_joining", "gender", "status", "custom_zone", "custom_region"
            ],
            filters=[["status", "=", "Active"]],
            ignore_permissions=True
        )
        
        # Process employee mapping
        emp_map = {}
        for emp in employees:
            if emp.user_id:
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
                    "department": emp.department or "-",
                    "company": emp.company or "-",
                    "zone": emp.custom_zone or "-",
                    "region": emp.custom_region or "-"
                }

        # ========== BRANCH DATA - NO PERMISSION ==========
        branches = frappe.get_all("Branch", 
            fields=["name", "sol_id"],
            ignore_permissions=True
        )
        
        branch_map = {}
        for branch in branches:
            if branch.name:
                branch_map[branch.name] = branch.sol_id or "-"

        # ========== LEAD DATA - WITH PERMISSION HOOK ==========
        try:
            # This will trigger your permission hook
            leads = frappe.db.get_list("Lead",
                fields=[
                    "name", "status", "lead_owner", "creation", "custom_branch",
                    "source", "lead_name", "custom_region", "custom_zone", "mobile_no"
                ],
                filters=filters or [],
                limit_start=limit_start,
                limit_page_length=limit_page_length,
                order_by="creation desc"
            )
            
            # ✅ FIX: Get counts using frappe.db.get_list instead of frappe.db.count
            # This ensures permission hook is applied to counts too
            
            # Total count with permission
            all_leads_with_permission = frappe.db.get_list("Lead",
                fields=["name"],
                filters=filters or []
                # Permission hook will be applied
            )
            total_count = len(all_leads_with_permission)
            
            # Converted count with permission
            converted_filters = (filters or []) + [["status", "=", "Converted"]]
            converted_leads = frappe.db.get_list("Lead",
                fields=["name"],
                filters=converted_filters
            )
            converted_count = len(converted_leads)
            
            # Follow up count with permission
            follow_up_filters = (filters or []) + [["status", "=", "Follow Up"]]
            follow_up_leads = frappe.db.get_list("Lead",
                fields=["name"],
                filters=follow_up_filters
            )
            follow_up_count = len(follow_up_leads)
            
            # Not interested count with permission
            not_interested_filters = (filters or []) + [["status", "=", "Not Interested"]]
            not_interested_leads = frappe.db.get_list("Lead",
                fields=["name"],
                filters=not_interested_filters
            )
            not_interested_count = len(not_interested_leads)
            
        except Exception as lead_error:
            frappe.log_error(f"Lead permission error: {str(lead_error)}")
            # Fallback with empty results
            leads = []
            total_count = 0
            converted_count = 0
            follow_up_count = 0
            not_interested_count = 0
        
        # Fetch products for each lead
        leads_with_products = []
        for lead in leads:
            try:
                lead_doc = frappe.get_doc("Lead", lead.name)
                
                products = []
                if hasattr(lead_doc, 'custom_product_table') and lead_doc.custom_product_table:
                    for product in lead_doc.custom_product_table:
                        products.append({
                            "product": product.product or "",
                            "product_name": product.product_name or "",
                            "amount": float(product.product_amount or 0),
                            "idx": product.idx or 0
                        })
                
                products.sort(key=lambda x: x.get("idx", 0))
                
                leads_with_products.append({
                    "name": lead.name,
                    "status": lead.status,
                    "lead_owner": lead.lead_owner,
                    "creation": lead.creation,
                    "branch": lead.custom_branch,
                    "source": lead.source,
                    "lead_name": lead.lead_name,
                    "region": lead.custom_region,
                    "zone": lead.custom_zone,
                    "contact": lead.mobile_no,
                    "products": products
                })
                
            except Exception as product_error:
                frappe.log_error(f"Error fetching products for lead {lead.name}: {str(product_error)}")
                leads_with_products.append({
                    "name": lead.name,
                    "status": lead.status,
                    "lead_owner": lead.lead_owner,
                    "creation": lead.creation,
                    "branch": lead.custom_branch,
                    "source": lead.source,
                    "lead_name": lead.lead_name,
                    "region": lead.custom_region,
                    "zone": lead.custom_zone,
                    "contact": lead.mobile_no,
                    "products": []
                })

        # Build response
        current_page = (limit_start // limit_page_length) + 1 if limit_page_length > 0 else 1
        has_more = (limit_start + len(leads)) < total_count
        
        result = {
            "success": True,
            "employees": emp_map,
            "branches": branch_map,
            "leads": leads_with_products,
            "pagination": {
                "current_page": current_page,
                "total_count": total_count,
                "page_size": limit_page_length,
                "has_more": has_more
            },
            "counts": {
                "total_leads": total_count,
                "converted": converted_count,
                "follow_up": follow_up_count,
                "not_interested": not_interested_count
            },
            "stats": {
                "total_employees": len(emp_map),
                "total_branches": len(branch_map),
                "permission_hook_applied": True,
                "current_user": frappe.session.user,
                "leads_fetched": len(leads_with_products),
                "counts_with_permission": True  # ✅ Added indicator
            }
        }
        
        frappe.log(f"✅ CRM API with permission hook: {len(leads_with_products)} leads, {total_count} total (with permission)")
        return result
        
    except Exception as e:
        frappe.log_error(f"Error in get_complete_crm_data API: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "employees": {},
            "branches": {},
            "leads": [],
            "pagination": {"current_page": 1, "total_count": 0, "page_size": 50, "has_more": False},
            "counts": {"total_leads": 0, "converted": 0, "follow_up": 0, "not_interested": 0},
            "stats": {"total_employees": 0, "total_branches": 0, "permission_hook_applied": False}
        }

@frappe.whitelist()
def get_analytics_data(filters=None):
    try:
        if filters and isinstance(filters, str):
            filters = frappe.parse_json(filters)
        
        # Employee data - NO PERMISSION
        employees = frappe.get_all("Employee", 
            fields=["name", "employee_name", "user_id", "designation", "branch", "custom_district", "custom_zone", "custom_region"],
            filters=[["status", "=", "Active"]],
            ignore_permissions=True
        )
        
        emp_map = {}
        for emp in employees:
            if emp.user_id:
                emp_name = emp.employee_name or emp.user_id
                emp_map[emp.user_id] = {
                    "name": emp_name,
                    "id": emp.name,
                    "designation": emp.designation or "-",
                    "branch": emp.branch or "-",
                    "district": emp.custom_district or "-",
                    "zone": emp.custom_zone or "-",
                    "region": emp.custom_region or "-"
                }

        # ✅ Lead data - WITH PERMISSION HOOK using get_list
        try:
            leads = frappe.db.get_list("Lead",
                fields=["lead_owner", "status", "custom_branch"],
                filters=filters or []
                # Permission hook will be applied automatically
            )
        except Exception as lead_error:
            frappe.log_error(f"Analytics lead permission error: {str(lead_error)}")
            leads = []
        
        return {
            "success": True,
            "employees": emp_map,
            "leads": leads,
            "permission_hook_applied": True,
            "total_leads_found": len(leads),
            "current_user": frappe.session.user
        }
        
    except Exception as e:
        frappe.log_error(f"Error in get_analytics_data API: {str(e)}")
        return {"success": False, "error": str(e), "employees": {}, "leads": []}
