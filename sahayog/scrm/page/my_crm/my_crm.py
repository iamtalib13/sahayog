 
import frappe
from frappe.utils import get_fullname, get_datetime
import base64
import json
 
def create_cursor(modified_timestamp, name):
    """Encodes modified_timestamp and name into a base64 cursor."""
    if not modified_timestamp or not name:
        return None
    # Use ISO format for consistent string representation of datetime
    cursor_str = f"{modified_timestamp.isoformat()}__{name}"
    return base64.urlsafe_b64encode(cursor_str.encode("utf-8")).decode("utf-8")
 
def decode_cursor(cursor):
    """Decodes a base64 cursor into modified_timestamp and name."""
    if not cursor:
        return None, None
    decoded_str = base64.urlsafe_b64decode(cursor.encode("utf-8")).decode("utf-8")
    parts = decoded_str.split("__", 1) # Split only on the first occurrence
    if len(parts) == 2:
        return get_datetime(parts[0]), parts[1] # Frappe's get_datetime to convert string to datetime object
    return None, None
 
@frappe.whitelist()
def get_crm_data(section: str, limit: int = 20, cursor: str = None, search_term: str = None):
    limit = int(limit)
    response = {"data": [], "next_cursor": None, "total_count": 0, "lead_count": 0, "appointment_count": 0}
 
    if section == "lead":
        data, next_cursor, total_count = _get_lead_data(limit, cursor, search_term)
        response.update({"data": data, "next_cursor": next_cursor, "total_count": total_count, "lead_count": total_count})
    elif section == "appointment":
        data, next_cursor, total_count = _get_appointment_data(limit, cursor, search_term)
        response.update({"data": data, "next_cursor": next_cursor, "total_count": total_count, "appointment_count": total_count})
    
    return response
 
def _get_lead_data(limit, cursor, search_term):
    current_user = frappe.session.user
    offset = int(cursor) if cursor and cursor.isdigit() else 0
    
    filters = [["lead_owner", "=", current_user]]
    or_filters = []
    if search_term:
        like_query = f"%{search_term}%"
        or_filters = [["lead_name", "like", like_query], ["mobile_no", "like", like_query], ["first_name", "like", like_query], ["email_id", "like", like_query]]

    # Total Count for Badge
    combined_filters = list(filters)
    if or_filters: combined_filters.insert(0, ["_or"] + or_filters)
    total_lead_count = frappe.db.count("Lead", filters=combined_filters)

    # Fetch Leads (ONLY ONE CALL)
    leads = frappe.get_list(
        "Lead",
        fields=["name", "lead_name", "first_name", "mobile_no", "email_id", "status", "source", "modified"],
        filters=filters,
        or_filters=or_filters,
        order_by="modified desc, name desc",
        limit_start=offset,
        limit_page_length=limit + 1
    )

    next_cursor = None
    if len(leads) > limit:
        leads.pop()
        next_cursor = str(offset + limit)

    if not leads: return [], None, 0

    # Enrichment (Product Amounts)
    lead_names = [d.name for d in leads]
    product_amounts = frappe.get_all(
        "Lead Product",
        fields=["parent", "SUM(product_amount) as total_amount"],
        filters={"parenttype": "Lead", "parent": ("in", lead_names)},
        group_by="parent"
    )
    amount_map = {d.parent: d.total_amount for d in product_amounts}
    for lead in leads:
        lead.totalAmount = amount_map.get(lead.name, 0)
    
    return leads, next_cursor, total_lead_count

def _get_appointment_data(limit, cursor, search_term):
    current_user = frappe.session.user
    offset = int(cursor) if cursor and cursor.isdigit() else 0
 
    filters = [["owner", "=", current_user]]
    or_filters = []
    if search_term:
        like_query = f"%{search_term}%"
        or_filters = [["customer_name", "like", like_query], ["customer_phone_number", "like", like_query]]

    combined_filters = list(filters)
    if or_filters: combined_filters.insert(0, ["_or"] + or_filters)
    total_count = frappe.db.count("Appointment", filters=combined_filters)
    
    appointments = frappe.get_list(
        "Appointment",
        fields=["name", "customer_name", "customer_phone_number", "scheduled_time", "status", "party", "modified"],
        filters=filters,
        or_filters=or_filters,
        order_by="modified desc, name desc",
        limit_start=offset,
        limit_page_length=limit + 1
    )

    next_cursor = None
    if len(appointments) > limit:
        appointments.pop()
        next_cursor = str(offset + limit)

    return appointments, next_cursor, total_count