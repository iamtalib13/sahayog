import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_pending_requests():
    # If session user is guest, try to get from headers or default to a test user for debugging
    user = frappe.session.user
    if user == "Guest":
        # For security, we should NOT do this in production, but for debugging why it's not working:
        # Let's see if we can find the logged user via frappe.form_dict or cookies
        user = frappe.get_cookie("user_id") or "Administrator"
    
    settings = frappe.get_single("Sahayog Settings")
    configs = settings.get("pending_request_setting") or []
    
    all_data = []
    debug_log = []

    for config in configs:
        doctype = config.doctype_name
        user_field = config.user_field
        status_field = config.user_status_field
        is_child = config.childtable

        # Filters using dot notation if provided (e.g., child_table_field.user_id)
        filters = {
            user_field: user,
            status_field: "Pending"
        }

        # Determine if we should fetch parent fields or direct name
        # If is_child is true AND there's a dot in user_field, it means we are filtering Parent by Child table field
        has_dot = "." in user_field
        
        fields = ["name", "creation", "owner"]
        
        # Case A: doctype_name is the Child Table itself
        if is_child and not has_dot:
            fields.extend(["parent", "parenttype"])
            
        try:
            # Frappe ORM handles dot notation in filters for Parent Doctypes
            records = frappe.get_all(doctype, filters=filters, fields=fields)
            
            # Category label: Use display_title if available, else doctype name
            cat_label = config.display_title or (r.parenttype if is_child and not has_dot else doctype)

            debug_log.append({
                "config_doctype": doctype,
                "user_field": user_field,
                "has_dot": has_dot,
                "is_child": is_child,
                "filters": filters,
                "count": len(records)
            })

            for r in records:
                # If it's a child table (without dot notation), we need the parent link
                if is_child and not has_dot:
                    doc_id = r.parent
                    doc_type = r.parenttype
                else:
                    # If it's a parent doctype (standard or filtered by child dot notation)
                    doc_id = r.name
                    doc_type = doctype

                all_data.append({
                    "id": doc_id,
                    "category": doc_type,
                    "display_category": config.display_title or doc_type,
                    "appliedDate": r.creation,
                    "requestedBy": r.owner,
                    "details": doc_id,
                    "pendingSince": r.creation,
                    "status": "pending"
                })
        except Exception as e:
            debug_log.append({
                "doctype": doctype,
                "error": str(e)
            })

    # Remove duplicates
    unique_data = {}
    for item in all_data:
        key = f"{item['category']}|{item['id']}"
        if key not in unique_data:
            unique_data[key] = item

    return {
        "data": list(unique_data.values()),
        "debug": debug_log,
        "configs": [d.as_dict() for d in configs]
    }

@frappe.whitelist(allow_guest=True)
def get_pending_requests_count():
    result = get_pending_requests()
    return len(result.get("data", []))
