
import frappe
from frappe.utils import flt

@frappe.whitelist()
def get_crm_data(section: str, limit: int = 20, cursor: str = "0", search_term: str = None):
    """
    Refactored endpoint for CRM data fetching.
    Optimizations: Integer validation, default limit management, and response consistency.
    """
    # Validation: Limit and Offset
    limit = frappe.parse_json(limit) or 20
    offset = int(cursor) if cursor and str(cursor).isdigit() else 0
    
    response = {
        "data": [], 
        "next_cursor": None, 
        "total_count": 0, 
        "lead_count": 0, 
        "appointment_count": 0
    }
 
    if section == "lead":
        data, next_cursor, total = _get_lead_data(limit, offset, search_term)
        response.update({"data": data, "next_cursor": next_cursor, "total_count": total, "lead_count": total})
        
    elif section == "appointment":
        data, next_cursor, total = _get_appointment_data(limit, offset, search_term)
        response.update({"data": data, "next_cursor": next_cursor, "total_count": total, "appointment_count": total})
    
    return response

def _get_lead_data(limit, offset, search_term):
    user = frappe.session.user
    
    # Filters Construction
    filters = [["lead_owner", "=", user]]
    or_filters = []
    
    if search_term:
        term = f"%{search_term}%"
        or_filters = [
            ["lead_name", "like", term],
            ["mobile_no", "like", term],
            ["first_name", "like", term],
            ["email_id", "like", term]
        ]

    # Optimized Count Fetching
    count_filters = list(filters)
    if or_filters:
        count_filters.insert(0, ["_or"] + or_filters)
    total_count = frappe.db.count("Lead", filters=count_filters)

    # Data Fetching
    leads = frappe.get_list(
        "Lead",
        fields=["name", "lead_name", "first_name", "mobile_no", "email_id", "status", "source", "modified"],
        filters=filters,
        or_filters=or_filters,
        order_by="modified desc, name desc",
        limit_start=offset,
        limit_page_length=limit + 1
    )

    next_cursor = str(offset + limit) if len(leads) > limit else None
    if len(leads) > limit:
        leads.pop()

    if not leads:
        return [], None, 0

    # Batch Fetching Product Amounts (Enrichment)
    lead_names = [d.name for d in leads]
    amounts = frappe.get_all(
        "Lead Product",
        fields=["parent", "SUM(product_amount) as total"],
        filters={"parent": ["in", lead_names]},
        group_by="parent"
    )
    
    amount_map = {d.parent: flt(d.total) for d in amounts}
    for lead in leads:
        lead.totalAmount = amount_map.get(lead.name, 0)
    
    return leads, next_cursor, total_count

def _get_appointment_data(limit, offset, search_term):
    user = frappe.session.user
    filters = [["owner", "=", user]]
    or_filters = []
    
    if search_term:
        term = f"%{search_term}%"
        or_filters = [
            ["customer_name", "like", term],
            ["customer_phone_number", "like", term]
        ]

    count_filters = list(filters)
    if or_filters:
        count_filters.insert(0, ["_or"] + or_filters)
    total_count = frappe.db.count("Appointment", filters=count_filters)
    
    appointments = frappe.get_list(
        "Appointment",
        fields=["name", "customer_name", "customer_phone_number", "customer_email", "customer_details", "scheduled_time", "status", "party", "modified"],
        filters=filters,
        or_filters=or_filters,
        order_by="modified desc, name desc",
        limit_start=offset,
        limit_page_length=limit + 1
    )

    next_cursor = str(offset + limit) if len(appointments) > limit else None
    if len(appointments) > limit:
        appointments.pop()
        
    return appointments, next_cursor, total_count


@frappe.whitelist()
def check_duplicate(mobile_no, products):
    from frappe.utils import add_days, nowdate
    import json
    
    p_list = json.loads(products) if isinstance(products, str) else products
    # 7 din purani limit
    seven_days_ago = add_days(nowdate(), -7)
    
    for p in p_list:
        # Check sirf tabhi kare jab creation date 7 din ke andar ho (using DATE for comparison)
        exists = frappe.db.sql("""
            SELECT l.name FROM `tabLead` l 
            JOIN `tabLead Product` lp ON lp.parent = l.name
            WHERE l.mobile_no = %s 
            AND lp.product = %s 
            AND lp.product_amount = %s 
            AND DATE(l.creation) >= %s 
            LIMIT 1
        """, (mobile_no, p['product'], p['product_amount'], seven_days_ago))
        
        if exists:
            return {"duplicate": True, "product": p['product']}
            
    return {"duplicate": False}