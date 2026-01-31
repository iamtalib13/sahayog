 
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
def get_crm_data(section: str, limit: int, cursor: str = None, search_term: str = None):
    """
    A single, optimized endpoint to fetch data for the My CRM page with cursor-based pagination.
    Returns data, next_cursor, and consolidated counts.
    """
    limit = int(limit)
    
    response = {"data": [], "next_cursor": None, "total_count": 0, "lead_count": 0, "appointment_count": 0}
 
    if section == "lead":
        data, next_cursor, total_lead_count = _get_lead_data(limit, cursor, search_term)
        response["data"] = data
        response["next_cursor"] = next_cursor
        response["total_count"] = total_lead_count # This total_count is for the current section
        response["lead_count"] = total_lead_count
        # Asynchronously update other tab counts if needed, or rely on frontend to call another method
        # For simplicity, we can fetch all counts here, but it adds to sync processing
        # Let's keep it simple for now and only return relevant count.
    elif section == "appointment":
        data, next_cursor, total_appointment_count = _get_appointment_data(limit, cursor, search_term)
        response["data"] = data
        response["next_cursor"] = next_cursor
        response["total_count"] = total_appointment_count # This total_count is for the current section
        response["appointment_count"] = total_appointment_count
    else:
        # Default response if section is invalid
        pass
    
    # Optionally, fetch counts for all tabs here if always needed on every data fetch
    # This keeps it a single API call but adds some latency if not needed every time
    # For now, let's keep it lean and assume `total_count` is for the current section.
    # Frontend will manage other badge updates on its own or through separate, lighter calls.
    
    return response
 
def _get_lead_data(limit, cursor, search_term):
    """Fetches and enriches Lead data efficiently with keyset pagination."""
    current_user = frappe.session.user
    
    filters = [["lead_owner", "=", current_user]]
    or_filters = []
    if search_term:
        like_query = f"%{search_term}%"
        or_filters = [
            ["lead_name", "like", like_query],
            ["mobile_no", "like", like_query],
            ["first_name", "like", like_query],
            ["email_id", "like", like_query],
        ]
    
    # Keyset Pagination Logic
  # Keyset Pagination Logic (Replaced with Offset for stability)
    # decode_cursor ko rehne dein, bas uska value offset ki tarah use karein
    offset = 0
    if cursor:
        try:
            # Agar cursor numeric hai (offset), toh use use karein
            if cursor.isdigit():
                offset = int(cursor)
            else:
                # Agar cursor purana base64 hai, toh safety ke liye 0 set karein ya offset nikalne ki logic likhein
                offset = 0 
        except:
            offset = 0

    # Fetch main lead data page
    leads = frappe.get_list(
        "Lead",
        fields=["name", "lead_name", "first_name", "mobile_no", "email_id", "status", "source", "modified"],
        filters=filters,
        or_filters=or_filters,
        order_by="modified desc, name desc",
        limit_start=offset, # Offset pagination
        limit_page_length=limit + 1
    )

    next_cursor = None
    if len(leads) > limit:
        leads.pop()
        # Agla cursor agla offset number hoga
        next_cursor = str(offset + limit)
 
    # Fetch total count with all filters for accurate badge display
    # Combine filters and or_filters for frappe.db.count
    combined_filters = list(filters) # Make a mutable copy
    if or_filters:
        combined_filters.insert(0, ["_or"] + or_filters) # Prepend _or clause
 
    total_lead_count = frappe.db.count(
        "Lead",
        filters=combined_filters
    )
 
    # Fetch main lead data page (fetch one extra for has_more check)
    leads = frappe.get_list(
        "Lead",
        fields=["name", "lead_name", "first_name", "mobile_no", "email_id", "status", "source", "modified"],
        filters=filters,
        or_filters=or_filters,
        order_by="modified desc, name desc", # Crucial for keyset pagination
        limit_page_length=limit + 1 # Fetch one extra record to check for next page
    )
 
    next_cursor = None
    if len(leads) > limit:
        # There is a next page. Remove the extra record and create cursor from the last *returned* record
        leads.pop()
        if leads: # Ensure leads list is not empty before creating cursor
            next_cursor = create_cursor(leads[-1].modified, leads[-1].name)
            
    # If no leads found, ensure empty data and null cursor
    if not leads:
        return [], None, 0
 
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
    """Fetches Appointment data owned by the current session user with keyset pagination."""
    current_user = frappe.session.user
 
    filters = {"owner": current_user}
    or_filters = []
    if search_term:
        like_query = f"%{search_term}%"
        or_filters.extend([
            ["customer_name", "like", like_query],
            ["customer_phone_number", "like", like_query],
        ])
 
    # Keyset Pagination Logic
   # Keyset Pagination Logic
    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    appointments = frappe.get_list(
        "Appointment",
        fields=["name", "customer_name", "customer_phone_number", "scheduled_time", "status", "party", "modified"],
        filters=filters,
        or_filters=or_filters,
        order_by="modified desc, name desc",
        limit_start=offset,
        limit_page_length=limit + 1,
    )

    next_cursor = None
    if len(appointments) > limit:
        appointments.pop()
        next_cursor = str(offset + limit)
    # Combine filters and or_filters for frappe.db.count
    combined_filters = list(filters) # Make a mutable copy
    if or_filters:
        combined_filters.insert(0, ["_or"] + or_filters) # Prepend _or clause
 
    total_appointment_count = frappe.db.count(
        "Appointment",
        filters=combined_filters
    )
    
    # Fetch main appointment data page (fetch one extra for has_more check)
    appointments = frappe.get_list(
        "Appointment",
        fields=["name", "customer_name", "customer_phone_number", "scheduled_time", "status", "party", "modified"],
        filters=filters,
        or_filters=or_filters,
        order_by="modified desc, name desc", # Crucial for keyset pagination
        limit_page_length=limit + 1, # Fetch one extra record to check for next page
    )
 
    next_cursor = None
    if len(appointments) > limit:
        # There is a next page. Remove the extra record and create cursor from the last *returned* record
        appointments.pop()
        if appointments: # Ensure appointments list is not empty before creating cursor
            next_cursor = create_cursor(appointments[-1].modified, appointments[-1].name)
            
    # If no appointments found, ensure empty data and null cursor
    if not appointments:
        return [], None, 0
 
    return appointments, next_cursor, total_appointment_count